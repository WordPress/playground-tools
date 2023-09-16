import { NodePHP } from '@php-wasm/node';

let childCount = 0;

/**
 * PRIVATE
 * Tracks stats of instances in a pool.
 */
class PoolInfo {
	id = childCount++; // Unique ID for debugging purposes.
	requests = 0; // Total requests processed.
	started = Date.now(); // Time spawned.
	active = false; // Whether instance is considered active.
}

/**
 * PRIVATE
 * Spawns new instances if the pool is not full.
 * Returns a list of new instances.
 */
const spawn = (pool) => {
	const newInstances = new Set();

	while (pool.maxJobs > 0 && pool.instanceInfo.size < pool.maxJobs) {
		const info = new PoolInfo();
		const instance = pool.spawner();
		pool.instanceInfo.set(instance, info);
		info.active = true;
		newInstances.add(instance);
	}

	return newInstances;
};

/**
 * PRIVATE
 * Reaps children if they've passed the maxRequest count.
 */
const reap = (pool) => {
	for (const [instance, info] of pool.instanceInfo) {
		if (pool.maxRequests > 0 && info.requests >= pool.maxRequests) {
			info.active = false;
			pool.instanceInfo.delete(instance);
			instance.then((unwrapped) => unwrapped.exit()).catch((error) => {});
			continue;
		}
	}
};

/**
 * PRIVATE
 * Handle fatal errors gracefully.
 */
const fatal = (pool, instance, error) => {
	console.error(error);

	if (pool.instanceInfo.has(instance)) {
		const info = pool.instanceInfo.get(instance);
		info.active = false;
		pool.instanceInfo.delete(instance);
	}
};

/**
 * PRIVATE
 * Find the next available idle instance.
 */
const getIdleInstance = (pool) => {
	const sorted = [...pool.instanceInfo].sort(
		(a, b) => a[1].requests - b[1].requests
	);

	for (const [instance, info] of sorted) {
		if (pool.running.has(instance)) {
			continue;
		}

		if (!info.active) {
			continue;
		}
		return instance;
	}

	return false;
};

/**
 * Maintains and refreshes a list of php instances
 * such that each one will only be fed X number of requests
 * before being discarded and replaced.
 */
export class Pool {
	instanceInfo = new Map(); // php => PoolInfo

	spawner: () => Promise<any>; // Callback to create new instances.
	maxRequests: number; // Max requests to feed each instance
	maxJobs: number; // Max number of instances to maintain at once.

	notifiers = new Map(); // Inverted promises to notify async code of backlogged item processed.
	running = new Set(); // Set of busy PHP instances.
	backlog = []; // Set of request callbacks waiting to be run.

	constructor({
		spawner = async (): Promise<any> => {},
		maxRequests = 2000,
		maxJobs = 5,
	} = {}) {
		this.spawner = spawner;
		this.maxRequests = maxRequests;
		this.maxJobs = maxJobs;
		reap(this);
		spawn(this);
	}

	/**
	 * Queue up a callback that will make a request when an
	 * instance becomes idle.
	 */
	async enqueue(item: (php: NodePHP) => Promise<any>) {
		const idleInstance = getIdleInstance(this);

		if (!idleInstance) {
			// Defer the callback if we don't have an idle instance available.
			this.backlog.push(item);

			// Split a promise open so it can be accepted or
			// rejected later when the item is processed.
			const notifier = new Promise((accept, reject) =>
				this.notifiers.set(item, { accept, reject })
			);

			// Return the notifier so async calling code
			// can still respond correctly when the item
			// is finally processed.
			return notifier;
		} else {
			// If we've got an instance available, run the provided callback.

			// Given an instance, create a new callback that will clean up
			// after the instance processes a request, and optionally
			// will also kick off the next request.
			const onCompleted = (instance) => async () => {
				this.running.delete(instance);

				reap(this);
				const newInstances = spawn(this);

				// Break out here if the backlog is empty.
				if (!this.backlog.length) {
					return;
				}

				// This is the instance that completed
				// so we can re-use it...
				let nextInstance = instance;

				// ... but, if we've just spanwed a fresh
				// instance, use that one instead.
				if (newInstances.size) {
					for (const instance of newInstances) {
						nextInstance = instance;
						break;
					}
				}

				const next = this.backlog.shift();
				const info = this.instanceInfo.get(nextInstance);

				this.running.add(nextInstance);
				info.requests++;

				let request;

				try {
					// Don't ACTUALLY do anything until the
					// instance is done spawning.
					request = next(await nextInstance);
				} catch (error) {
					// Re-queue the request if the instance
					// failed initialization.
					this.backlog.unshift(next);

					// Catch any errors and log to the console.
					// Deactivate the instance.
					fatal(this, nextInstance, error);

					return;
				}

				const completed = onCompleted(nextInstance);

				// Make sure onComplete & running.delete run
				// no matter how the request resolves.
				request.finally(() => {
					this.running.delete(nextInstance);
					completed();
				});

				// Grab the accept handler from the notfier
				// promise and run it if the request resolves.
				request.then((ret) => {
					const notifier = this.notifiers.get(next);
					this.notifiers.delete(next);
					notifier.accept(ret);
				});

				// Grab the reject handler from the notfier
				// promise and run it if the request rejects.
				request.catch((error) => {
					const notifier = this.notifiers.get(next);
					this.notifiers.delete(next);
					notifier.reject(error);
					// Catch any errors and log to the console.
					// Deactivate the instance.
					fatal(this, nextInstance, error);
				});
			};

			const info = this.instanceInfo.get(idleInstance);

			this.running.add(idleInstance);
			info.requests++;

			let request;

			try {
				// Don't ACTUALLY do anything until the
				// instance is done spawning.
				request = item(await idleInstance);
			} catch (error) {
				// Re-queue the request if the instance
				// failed initialization.
				this.backlog.unshift(item);

				// Catch any errors and log to the console.
				// Deactivate the instance.
				fatal(this, idleInstance, error);

				// Split a promise open so it can be accepted or
				// rejected later when the item is processed.
				const notifier = new Promise((accept, reject) =>
					this.notifiers.set(item, { accept, reject })
				);

				// Return the notifier so async calling code
				// can still respond correctly when the item
				// is finally processed.
				return notifier;
			}

			// Make sure onComplete runs no matter how the request resolves.
			request.finally(onCompleted(idleInstance));

			// Catch any errors and log to the console.
			// Deactivate the instance.
			request.catch((error) => fatal(this, idleInstance, error));

			return request;
		}
	}
}

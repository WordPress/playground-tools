import { NodePHP } from '@php-wasm/node';

const Fatal = Symbol('Fatal');
const Spawn = Symbol('Spawn');
const Reap = Symbol('Reap');

let childCount = 0;

export class PoolInfo {
	id = childCount++;
	requests = 0;
	started = Date.now();
	active = false;
}

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
		this[Reap]();
		this[Spawn]();
	}

	/**
	 * Find the next available idle instance.
	 */
	getIdleInstance() {
		const sorted = [...this.instanceInfo].sort(
			(a, b) => a[1].requests - b[1].requests
		);

		for (const [instance, info] of sorted) {
			if (this.running.has(instance)) {
				continue;
			}

			if (!info.active) {
				continue;
			}
			return instance;
		}

		return false;
	}

	/**
	 * Queue up a callback that will make a request when an
	 * instance becomes idle.
	 */
	async enqueue(item: (php: NodePHP) => Promise<any>) {
		const idleInstance = this.getIdleInstance();

		if (!idleInstance) {
			// Defer the callback if we don't have an idle instance available.
			this.backlog.push(item);

			// Split a promise open so it can be accepted or
			// rejected later when the item is processed.
			const notifier = new Promise((accept, reject) =>
				this.notifiers.set(item, [accept, reject])
			);

			return notifier;
		} else {
			// If we've got an instance available, run the provided callback.

			// Given an instance, create a new callback that will clean up
			// after the instance processes a request, and optionally
			// will also kick off the next request.
			const onCompleted = (instance) => async () => {
				this.running.delete(instance);

				this[Reap]();
				const newInstances = this[Spawn]();

				// Break out here if the backlog is empty.
				if (!this.backlog.length) {
					return;
				}

				// This is the instance that completed
				// so we can re-use it...
				let nextInstance = instance;

				// ... but, if we've just spanwed a fresh
				// instance, use that one instead.
				if (newInstances.size)
					for (const instance of newInstances) {
						nextInstance = instance;
						break;
					}

				const next = this.backlog.shift();
				const info = this.instanceInfo.get(nextInstance);

				this.running.add(nextInstance);
				info.requests++;

				// Don't ACTUALLY do anything until the
				// instance is done spawning.
				const request = next(await nextInstance);

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
					notifier[0](ret);
				});

				// Grab the reject handler from the notfier
				// promise and run it if the request rejects.
				request.catch((error) => {
					const notifier = this.notifiers.get(next);
					this.notifiers.delete(next);
					notifier[1](error);
					// Catch any errors and log to the console.
					// Deactivate the instance.
					this[Fatal](nextInstance, error);
				});
			};

			const info = this.instanceInfo.get(idleInstance);

			this.running.add(idleInstance);
			info.requests++;

			// Don't ACTUALLY do anything until the
			// instance is done spawning.
			const request = item(await idleInstance);

			// Make sure onComplete runs no matter how the request resolves.
			request.finally(onCompleted(idleInstance));

			// Catch any errors and log to the console.
			// Deactivate the instance.
			request.catch((error) => this[Fatal](idleInstance, error));

			return request;
		}
	}

	/**
	 * PRIVATE
	 * Spawns new instances if the pool is not full.
	 * Returns a list of new instances.
	 */
	[Spawn]() {
		const newInstances = new Set();
		while (this.maxJobs > 0 && this.instanceInfo.size < this.maxJobs) {
			const info = new PoolInfo();
			const instance = this.spawner();
			this.instanceInfo.set(instance, info);
			info.active = true;
			newInstances.add(instance);
		}
		return newInstances;
	}

	/**
	 * PRIVATE
	 * Reaps children if they've passed the maxRequest count.
	 */
	[Reap]() {
		for (const [instance, info] of this.instanceInfo) {
			if (this.maxRequests > 0 && info.requests >= this.maxRequests) {
				info.active = false;
				this.instanceInfo.delete(instance);
				// instance.then(unwrapped => unwrapped.destroy());
				continue;
			}
		}
	}

	/**
	 * PRIVATE
	 * Handle fatal errors gracefully.
	 */
	[Fatal](instance, error) {
		console.error(error);
		if (this.instanceInfo.has(instance)) {
			const info = this.instanceInfo.get(instance);
			info.active = false;
			this.instanceInfo.delete(instance);
		}
	}
}

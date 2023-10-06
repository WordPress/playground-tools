type instance = any;

type request = (instance: instance) => Promise<any>;

export type poolOptions = {
	spawn: () => Promise<instance>;
	reap?: (instance: instance) => void;
	fatal?: (instance: instance, error: any) => any;
	maxRequests?: number;
	maxJobs?: number;
};

let childCount = 0;

/**
 * Tracks stats of instances in a pool.
 * @private
 */
class PoolInfo {
	id = childCount++; // Unique ID for debugging purposes.
	requests = 0; // Total requests processed.
	started = Date.now(); // Time spawned.
	active = false; // Whether instance is considered active.
}

/**
 * Spawns new instances if the pool is not full.
 * Returns a list of new instances.
 * @param pool the pool object to work on
 * @private
 */
const spawn = async (pool: Pool) => {
	const newInstances = new Set();

	if (pool.maxJobs <= 0) return newInstances;

	while (pool.instanceInfo.size < pool.maxJobs) {
		const info = new PoolInfo();
		const instance = await pool.spawn();
		pool.instanceInfo.set(instance, info);
		info.active = true;
		newInstances.add(instance);
	}

	return newInstances;
};

/**
 * Reaps children if they've passed the maxRequest count.
 * @param pool the pool object to work on
 * @private
 */
const reap = (pool: Pool) => {
	for (const [instance, info] of pool.instanceInfo) {
		if (pool.maxRequests > 0 && info.requests >= pool.maxRequests) {
			info.active = false;
			pool.instanceInfo.delete(instance);
			pool.reap(instance);
			continue;
		}
	}
};

/**
 * Handle fatal errors gracefully.
 * @param pool the pool object to work on
 * @param instance the php instance to clean up
 * @param error the actual error that got us here
 * @private
 */
const fatal = (pool: Pool, instance: instance, error: Error) => {

	console.error(error);

	if (instance && pool.instanceInfo.has(instance)) {
		const info = pool.instanceInfo.get(instance);
		info.active = false;
		pool.instanceInfo.delete(instance);
	}

	return pool.fatal(instance, error);
};

/**
 * Find the next available idle instance.
 * @private
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
 *
 * Since we're dealing with a linear, "physical" memory array, as opposed to a
 * virtual memory system afforded by most modern OSes, we're prone to things
 * like memory fragmentation. In that situation, we could have the entire
 * gigabyte empty except for a few sparse allocations. If no contiguous region
 * of memory exists for the length requested, memory allocations will fail.
 * This tends to happen when a new request attempts to initialize a heap
 * structure but cannot find a contiguous 2mb chunk of memory.
 *
 * We can go as far as debugging PHP itself, and contributing the fix upstream.
 * But even in this case we cannot guarantee that a third party extension will
 * not introduce a leak sometime in the future. Therefore, we should have a
 * solution robust to memory leaks that come from upstream code. I think that
 * following the native strategy is the best way.
 *
 * https://www.php.net/manual/en/install.fpm.configuration.php#pm.max-requests
 *
 */
export class Pool {
	instanceInfo = new Map(); // php => PoolInfo

	spawn: () => Promise<any>; // Async callback to create new instances.
	fatal: (instance: instance, error: any) => any; // Async callback called on instance fatal errors.
	reap: (instance: instance) => void; // Async callback called on destroyed instances.
	maxRequests: number; // Max requests to feed each instance
	maxJobs: number; // Max number of instances to maintain at once.

	resolvers = new Map(); // Inverted promises to notify async code of backlogged item processed.
	running = new Set(); // Set of busy PHP instances.
	backlog = []; // Set of request callbacks waiting to be run.

	/**
	 * Create a new pool.
	 * @param options - {spawn, maxRequests, maxJobs}
	 */
	constructor({
		maxRequests = 128,
		maxJobs = 1,
		spawn = undefined,
		fatal = (instance: instance, error: any) => error,
		reap = (instance: instance) => {},
	} = {}) {
		if (!spawn) {
			throw new Error('Spawn method is required for pool.');
		}

		Object.defineProperties(this, {
			maxRequests: { value: maxRequests },
			maxJobs: { value: maxJobs },
			spawn: { value: spawn },
			fatal: { value: fatal },
			reap: { value: reap },
		});
	}

	/**
	 * Queue up a callback that will make a request when an
	 * instance becomes idle.
	 * @param item Callback to run when intance becomes available. Should accept the instance as the first and only param, and return a promise that resolves when the request is complete.
	 * @public
	 */
	async enqueue(item: request): Promise<any> {
		reap(this);

		let idleInstance;

		try {
			await spawn(this);
			idleInstance = getIdleInstance(this);
		} catch (error) {
			return Promise.reject(fatal(this, idleInstance, error));
		}

		// Defer the callback if we don't have an idle instance available.
		if (!idleInstance) {
			this.backlog.push(item);

			// Split a promise open so it can be resolved or
			// rejected later when the item is processed.
			const notifier = new Promise((resolve, reject) =>
				this.resolvers.set(item, { resolve, reject })
			);

			// Return the notifier so async calling code
			// can still respond correctly when the item
			// is finally processed.
			return notifier;
		}

		// Given an instance, create a new callback that will clean up
		// after the instance processes a request, and optionally
		// will also kick off the next request.
		const onCompleted = (instance) => async () => {

			this.running.delete(instance);

			reap(this);

			// Break out here if the backlog is empty.
			if (!this.backlog.length) {
				return;
			}

			// This is the instance that completed
			// so we can re-use it...
			let nextInstance = instance;

			const next = this.backlog.shift();
			const info = this.instanceInfo.get(nextInstance);

			this.running.add(nextInstance);
			info.requests++;

			let request;

			try {
				const newInstances = await spawn(this);

				// ... but, if we've just spanwed a fresh
				// instance, use that one instead.
				if (newInstances.size) {
					for (const instance of newInstances) {
						nextInstance = instance;
						break;
					}
				}

				request = next(nextInstance);
			} catch (error) {
				// Grab the reject handler from the notfier
				// promise and run it if there is an error.
				const resolver = this.resolvers.get(next);
				this.resolvers.delete(next);
				resolver.reject(fatal(this, nextInstance, error));
				return;
			}

			const completed = onCompleted(nextInstance);

			// Make sure onComplete & running.delete run
			// no matter how the request resolves.
			request.finally(() => {
				this.running.delete(nextInstance);
				completed();
			});

			// Grab the resolve handler from the notfier
			// promise and run it if the request resolves.
			request.then((ret) => {
				const resolver = this.resolvers.get(next);
				this.resolvers.delete(next);
				resolver.resolve(ret);
			});

			// Grab the reject handler from the notfier
			// promise and run it if the request rejects.
			request.catch((error) => {
				const resolver = this.resolvers.get(next);
				this.resolvers.delete(next);
				resolver.reject(fatal(this, nextInstance, error));
			});
		};

		const info = this.instanceInfo.get(idleInstance);

		this.running.add(idleInstance);
		info.requests++;

		let request;

		// If we've got an instance available, run the provided callback.
		try {
			request = item(idleInstance);
		} catch (error) {
			return Promise.reject(fatal(this, idleInstance, error));
		}

		// Make sure onComplete runs no matter how the request resolves.
		request.finally(onCompleted(idleInstance));

		// Catch any errors and log to the console.
		// Deactivate the instance.
		request.catch((error) => fatal(this, idleInstance, error));

		return request;
	}
}

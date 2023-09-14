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
	instances = new Map(); // php => PoolInfo

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
		Object.assign(this, { spawner, maxRequests, maxJobs });
		this[Reap]();
		this[Spawn]();
	}

	/**
	 * Find the next available idle instance.
	 */
	getIdleInstance() {
		const sorted = [...this.instances].sort(
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

			// When the provided callback completes, check to see if
			// any more requests have been added to the pool
			const onCompleted = async () => {
				this.running.delete(idleInstance);

				this[Reap]();
				this[Spawn]();

				if (!this.backlog.length) {
					return;
				}

				const idleInstanceNext = this.getIdleInstance();

				const next = this.backlog.shift();
				const info = this.instances.get(idleInstanceNext);

				info.requests++;

				const request = next(await idleInstanceNext);

				request.finally(onCompleted);

				request.then(ret => {
					const notifier = this.notifiers.get(next);
					this.notifiers.delete(next);
					notifier[0](ret);
				});

				request.catch(error => {
					const notifier = this.notifiers.get(next);
					this.notifiers.delete(next);
					notifier[1](error);
					this[Fatal](idleInstanceNext, error);
				});

				this.running.add(idleInstance);
			};

			const info = this.instances.get(idleInstance);

			info.requests++;

			this.running.add(idleInstance);

			const request = item(await idleInstance);

			request.catch((error) => this[Fatal](idleInstance, error));

			// Make sure onComplete runs no matter how the request resolves
			request.finally(onCompleted);

			return request;
		}
	}

	/**
	 * PRIVATE
	 * Spawns new instances if the pool is not full.
	 */
	[Spawn]() {
		while (this.maxJobs > 0 && this.instances.size < this.maxJobs) {
			const info = new PoolInfo();
			const instance = this.spawner();
			this.instances.set(instance, info);
			info.active = true;
		}
	}

	/**
	 * PRIVATE
	 * Reaps children if they've passed the maxRequest count.
	 */
	[Reap]() {
		for (const [instance, info] of this.instances) {
			if (this.maxRequests > 0 && info.requests >= this.maxRequests) {
				info.active = false;
				this.instances.delete(instance);
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
		if (this.instances.has(instance)) {
			const info = this.instances.get(instance);
			info.active = false;
			this.instances.delete(instance);
		}
	}
}

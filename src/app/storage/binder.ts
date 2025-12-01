import type { Cleanup, ILogger } from "@/types";

export interface StorageBindingTarget<T> {
	getValue(): Promise<T>;
	setValue(value: T): Promise<void>;
	watch(callback: (value: T) => void): Cleanup;
}

interface BindOptions {
	readonly logKey?: string;
}

export class StorageBinder {
	public constructor(
		private readonly registerCleanup: (cleanup: Cleanup) => void,
		private readonly logger?: ILogger,
	) {}

	public async bind<T>(
		target: StorageBindingTarget<T>,
		handler: (value: T) => Promise<void> | void,
		options?: BindOptions,
	): Promise<void> {
		const apply = async (value: T) => {
			await handler(value);
			if (this.logger && options?.logKey) {
				this.logger.debug("Storage value applied", {
					key: options.logKey,
					value,
				});
			}
		};

		await apply(await target.getValue());

		const cleanup = target.watch((value) => {
			void apply(value);
		});
		this.registerCleanup(cleanup);
	}

	public async bindBoolean(
		target: StorageBindingTarget<boolean>,
		handlers: {
			onEnable: () => Promise<void> | void;
			onDisable: () => Promise<void> | void;
		},
		options?: BindOptions,
	): Promise<void> {
		return this.bind(
			target,
			async (enabled) => {
				if (enabled) {
					await handlers.onEnable();
				} else {
					await handlers.onDisable();
				}
			},
			options,
		);
	}
}

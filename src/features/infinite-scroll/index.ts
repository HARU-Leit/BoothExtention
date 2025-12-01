import { BaseFeature, type Feature } from "@/app/feature";
import { InfiniteScroll } from "./InfiniteScroll";

class InfiniteScrollFeature extends BaseFeature {
	public readonly id = "infinite-scroll";
	private infiniteScroll: InfiniteScroll | null = null;

	protected async onInit(): Promise<void> {
		const binder = this.getStorageBinder();
		await binder.bindBoolean(
			this.storage.infiniteScrollEnabled,
			{
				onEnable: async () => {
					const instance = this.getInfiniteScroll();
					await instance.init((items) => {
						if (items.length > 0) {
							this.events.emit("grid:items-appended", items);
						}
					});
					this.logger.info("Infinite scroll enabled");
				},
				onDisable: () => {
					this.infiniteScroll?.disable();
					this.logger.info("Infinite scroll disabled");
				},
			},
			{ logKey: "infiniteScrollEnabled" },
		);

		this.registerCleanup(() => {
			this.infiniteScroll?.disable();
		});
	}

	private getInfiniteScroll(): InfiniteScroll {
		if (!this.infiniteScroll) {
			this.infiniteScroll = new InfiniteScroll(this.gridPipeline);
		}
		return this.infiniteScroll;
	}
}

export function createInfiniteScrollFeature(): Feature {
	return new InfiniteScrollFeature();
}

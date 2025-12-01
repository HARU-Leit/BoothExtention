import { BaseFeature, type Feature } from "@/app/feature";
import type { BlockedShop } from "@/app/storage";
import { ShopBlocker } from "./ShopBlocker";
import { toggleShopInList } from "./shopBlockControls";

class ShopBlockerFeature extends BaseFeature {
	public readonly id = "shop-blocker";
	private readonly blocker = new ShopBlocker();
	private blocked: BlockedShop[] = [];

	protected async onInit(): Promise<void> {
		this.registerPipelineHooks();
		this.blocked = await this.storage.blockedShops.getValue();
		this.blocker.updateBlockedShops(this.blocked);

		const binder = this.getStorageBinder();
		await binder.bind(
			this.storage.blockedShops,
			(updated) => {
				this.blocked = updated;
				this.blocker.updateBlockedShops(updated);
				this.logger.info("Blocked shops updated", { count: updated.length });
			},
			{ logKey: "blockedShops" },
		);

		await this.setupShopButton();
	}

	private registerPipelineHooks(): void {
		this.registerCleanup(
			this.gridPipeline.registerBeforeAppend((items, stage) =>
				this.blocker.filterBlockedItems(items, stage),
			),
		);
		this.registerCleanup(
			this.gridPipeline.registerAfterAppend((items) => {
				this.blocker.handleItemsAppended(items);
			}),
		);
	}

	private async setupShopButton(): Promise<void> {
		const shopName = this.blocker.getCurrentShopName();
		if (!shopName) return;

		const isInitiallyBlocked = this.blocked.some(
			(shop) => shop.name === shopName,
		);

		await this.blocker.addBlockButton(isInitiallyBlocked, async (state) => {
			this.blocked = toggleShopInList(this.blocked, shopName, state);
			await this.storage.blockedShops.setValue(this.blocked);
			this.logger.info("Shop block toggled", {
				shop: shopName,
				blocked: state,
			});
		});
	}
}

export function createShopBlockerFeature(): Feature {
	return new ShopBlockerFeature();
}

import { BaseFeature, type Feature } from "@/app/feature";
import { StickySidebar } from "./StickySidebar";

class StickySidebarFeature extends BaseFeature {
	public readonly id = "sticky-sidebar";

	protected onInit(): void {
		const stickySidebar = new StickySidebar();
		stickySidebar.init();
		this.logger.info("Sticky sidebar initialized");

		this.registerCleanup(() => {
			stickySidebar.destroy();
			this.logger.info("Sticky sidebar destroyed");
		});
	}
}

export function createStickySidebarFeature(): Feature {
	return new StickySidebarFeature();
}

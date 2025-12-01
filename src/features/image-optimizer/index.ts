import { BaseFeature, type Feature } from "@/app/feature";
import { ImageOptimizer } from "./ImageOptimizer";

class ImageOptimizerFeature extends BaseFeature {
	public readonly id = "image-optimizer";

	protected onInit(): void {
		const optimizer = new ImageOptimizer();
		optimizer.enableNativeLazyLoad();
		this.registerCleanup(() => {
			optimizer.destroy();
			this.logger.info("Image optimizer destroyed");
		});
		if (optimizer.isItemDetailPage()) {
			this.logger.info(
				"Image optimizer initialized (item page - native lazy load only)",
			);
			return;
		}

		optimizer.enableLazyLoader();
		this.registerCleanup(
			this.gridPipeline.registerAfterAppend((elements) => {
				optimizer.optimizeElements(elements);
			}),
		);
		this.logger.info("Image optimizer initialized (grid accelerated)");
	}
}

export function createImageOptimizerFeature(): Feature {
	return new ImageOptimizerFeature();
}

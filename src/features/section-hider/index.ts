import { BaseFeature, type Feature } from "@/app/feature";
import { SectionHider } from "./SectionHider";

class SectionHiderFeature extends BaseFeature {
	public readonly id = "section-hider";
	private readonly sectionHider = new SectionHider();

	protected async onInit(): Promise<void> {
		const binder = this.getStorageBinder();
		await binder.bind(
			this.storage.hiddenSections,
			(sections) => {
				this.sectionHider.apply(sections);
				this.logger.info("Section visibility updated", sections);
			},
			{ logKey: "hiddenSections" },
		);
	}
}

export function createSectionHiderFeature(): Feature {
	return new SectionHiderFeature();
}

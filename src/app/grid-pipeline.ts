import type { Cleanup } from "@/types";
import { domBatcher } from "@/utils/domBatcher";

export type GridItemStage = "bootstrap" | "append";

export type GridItemBeforeHook = (
	items: Element[],
	stage: GridItemStage,
) => Element[] | undefined | Promise<Element[] | undefined>;

export type GridItemAfterHook = (
	items: readonly Element[],
	stage: GridItemStage,
) => void | Promise<void>;

// グリッド要素追加の前後でフックを挟み、機能同士の調停を行う
export class GridPipeline {
	private readonly beforeHooks = new Set<GridItemBeforeHook>();
	private readonly afterHooks = new Set<GridItemAfterHook>();

	public registerBeforeAppend(hook: GridItemBeforeHook): Cleanup {
		this.beforeHooks.add(hook);
		return () => {
			this.beforeHooks.delete(hook);
		};
	}

	public registerAfterAppend(hook: GridItemAfterHook): Cleanup {
		this.afterHooks.add(hook);
		return () => {
			this.afterHooks.delete(hook);
		};
	}

	public async runBeforeAppend(
		items: Element[],
		stage: GridItemStage,
	): Promise<Element[]> {
		if (this.beforeHooks.size === 0) {
			return items;
		}

		let working = items;
		for (const hook of this.beforeHooks) {
			const result = await hook(working, stage);
			if (Array.isArray(result)) {
				working = result;
			}
		}

		if (stage === "bootstrap") {
			this.removeDroppedElements(items, working);
		}

		return working;
	}

	private removeDroppedElements(
		original: readonly Element[],
		filtered: readonly Element[],
	): void {
		if (filtered.length >= original.length) {
			return;
		}

		const keep = new Set(filtered);
		const toRemove = original.filter((element) => !keep.has(element));
		if (toRemove.length === 0) return;

		domBatcher.write(() => {
			for (const element of toRemove) {
				element.remove();
			}
		});
	}

	public async runAfterAppend(
		items: readonly Element[],
		stage: GridItemStage,
	): Promise<void> {
		if (this.afterHooks.size === 0 || items.length === 0) {
			return;
		}

		for (const hook of this.afterHooks) {
			await hook(items, stage);
		}
	}
}

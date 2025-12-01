import { SELECTORS } from "@/config/constants";
import { logger } from "@/shared/core";
import { hiddenSectionsSchema } from "@/shared/schema";
import type { HiddenSections } from "@/types";
import { toggleDisplay } from "@/utils/dom";

/**
 * セクション非表示機能
 *
 * カテゴリ結果や最近見た商品などのセクションを非表示にする
 */
export class SectionHider {
	/**
	 * セクション非表示設定を適用
	 *
	 * @param sections - 非表示設定オブジェクト
	 */
	public apply(sections: HiddenSections): void {
		const safeSections = hiddenSectionsSchema.parse(sections);
		toggleDisplay(SELECTORS.CATEGORIES, !safeSections.categoryResults);
		toggleDisplay(SELECTORS.RECENT_VIEWED, !safeSections.recentlyViewed);

		logger.info("Section hiding applied");
	}
}

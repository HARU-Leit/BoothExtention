<!--
  SectionHiderSection.svelte - セクション非表示設定

  以下のセクションの表示/非表示を管理:
  - カテゴリ結果
  - 最近見た商品
-->
<script lang="ts">
import type { HiddenSections } from "@/app/storage";
import { t } from "@/utils/i18n";

interface Props {
	sections: HiddenSections;
	onSectionsChange: (sections: HiddenSections) => void;
}

const { sections, onSectionsChange }: Props = $props();

function handleCategoryResultsChange(event: Event) {
	const target = event.target as HTMLInputElement;
	onSectionsChange({
		...sections,
		categoryResults: target.checked,
	});
}

function handleRecentlyViewedChange(event: Event) {
	const target = event.target as HTMLInputElement;
	onSectionsChange({
		...sections,
		recentlyViewed: target.checked,
	});
}
</script>

<section class="section">
	<h2 class="section-title">{t("sections.title")}</h2>
	<div class="checkbox-list">
		<label class="checkbox-item">
			<input
				type="checkbox"
				checked={sections.categoryResults}
				onchange={handleCategoryResultsChange}
			/>
			<span>{t("sections.categoryResults")}</span>
		</label>
		<label class="checkbox-item">
			<input
				type="checkbox"
				checked={sections.recentlyViewed}
				onchange={handleRecentlyViewedChange}
			/>
			<span>{t("sections.recentViewed")}</span>
		</label>
	</div>
</section>

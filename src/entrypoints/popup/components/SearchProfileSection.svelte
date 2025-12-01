<!--
  SearchProfileSection.svelte - 検索プロファイル設定セクション

  検索条件（キーワード、タグ、除外ワード、ソート順など）を
  編集するためのフォームコンポーネント
-->
<script lang="ts">
import type { LanguageSearchProfile } from "@/shared/search";
import { DEFAULT_SEARCH_SORT, sanitizeArray } from "@/shared/search";
import { t } from "@/utils/i18n";

// ========================
// プロパティ
// ========================
export let profile: LanguageSearchProfile;
export let enabled: boolean | undefined;
// biome-ignore lint/style/useConst: exported props must remain mutable for parent bindings
export let isDirty = false;
export let onProfileChange:
	| ((changes: Partial<LanguageSearchProfile>) => void)
	| undefined;
export let onToggleEnabled: ((value: boolean) => void) | undefined;
export let onSave: (() => void) | undefined;
export let onReset: (() => void) | undefined;

// ========================
// ローカル状態
// ========================
let tagsText = "";
let exceptText = "";
let displayEnabled = true;
let sortDisplayValue: string = DEFAULT_SEARCH_SORT;
$: controlsDisabled = !displayEnabled;
$: sortLocked = Boolean(profile?.recentOnly);

$: tagsText = profile ? profile.tags.join("\n") : "";
$: exceptText = profile ? profile.exceptWords.join("\n") : "";
$: displayEnabled = enabled ?? true;
$: sortDisplayValue = profile
	? profile.recentOnly
		? "new"
		: profile.sort
	: DEFAULT_SEARCH_SORT;

// ========================
// 選択肢定義
// ========================
const sortOptions = [
	{ value: "popularity", label: t("searchProfiles.sortOptions.popularity") },
	{ value: "new", label: t("searchProfiles.sortOptions.new") },
	{ value: "wish_lists", label: t("searchProfiles.sortOptions.wish_lists") },
	{ value: "price_desc", label: t("searchProfiles.sortOptions.price_desc") },
	{ value: "price_asc", label: t("searchProfiles.sortOptions.price_asc") },
];

const adultOptions = [
	{ value: "absent", label: t("searchProfiles.adultOptions.absent") },
	{ value: "include", label: t("searchProfiles.adultOptions.include") },
	{ value: "only", label: t("searchProfiles.adultOptions.only") },
];

// ========================
// イベントハンドラ
// ========================

/** キーワード入力の処理 */
function handleKeywordInput(event: Event): void {
	const target = event.currentTarget as HTMLInputElement;
	onProfileChange?.({ keyword: target.value });
}

/** タグ入力の処理（改行区切り） */
function handleTagsInput(event: Event): void {
	const target = event.currentTarget as HTMLTextAreaElement;
	const values = sanitizeArray(target.value.split(/\r?\n/));
	onProfileChange?.({ tags: values });
}

/** 除外ワード入力の処理（改行区切り） */
function handleExceptInput(event: Event): void {
	const target = event.currentTarget as HTMLTextAreaElement;
	const values = sanitizeArray(target.value.split(/\r?\n/));
	onProfileChange?.({ exceptWords: values });
}

/** チェックボックス変更の処理 */
function handleCheckboxChange(
	key: keyof Pick<LanguageSearchProfile, "inStockOnly" | "recentOnly">,
	value: boolean,
): void {
	onProfileChange?.({
		[key]: value,
	} as Partial<LanguageSearchProfile>);
}

/** 価格入力の処理 */
function handlePriceInput(
	key: keyof Pick<LanguageSearchProfile, "minPrice" | "maxPrice">,
	event: Event,
): void {
	const target = event.currentTarget as HTMLInputElement;
	const value = target.value.trim();
	if (value === "") {
		onProfileChange?.({ [key]: null } as Partial<LanguageSearchProfile>);
		return;
	}
	const parsed = Number.parseInt(value, 10);
	if (!Number.isNaN(parsed) && parsed > 0) {
		onProfileChange?.({ [key]: parsed } as Partial<LanguageSearchProfile>);
	}
}

/** セレクトボックス変更の処理 */
function handleSelectChange(
	key: keyof Pick<LanguageSearchProfile, "sort" | "adult">,
	value: string,
): void {
	onProfileChange?.({
		[key]: value,
	} as Partial<LanguageSearchProfile>);
}
/** プロファイル有効/無効トグルの処理 */
function handleEnabledToggle(event: Event): void {
	const target = event.currentTarget as HTMLInputElement;
	onToggleEnabled?.(target.checked);
}
</script>

<div class="search-profile-section">
	<div class="search-profile-header">
		<h2>🔍 {t("searchProfiles.title")}</h2>
		<label class="toggle-switch" aria-label={t("searchProfiles.enabledToggle")}>
			<input
				type="checkbox"
				checked={displayEnabled}
				onchange={handleEnabledToggle}
			/>
			<span class="slider"></span>
		</label>
	</div>
	<p class="section-description">{t("searchProfiles.description")}</p>

	<div class="profile-actions">
		<button
			type="button"
			class="primary"
			disabled={!isDirty}
			onclick={() => onSave?.()}
		>
			{t("buttons.save")}
		</button>
		<button
			type="button"
			class="ghost"
			disabled={!isDirty}
			onclick={() => onReset?.()}
		>
			{t("buttons.reset")}
		</button>
	</div>

	<div class="profile-form" data-disabled={controlsDisabled}>
		<label>
			<span>{t("searchProfiles.keyword")}</span>
			<input
				type="text"
				value={profile.keyword}
				oninput={handleKeywordInput}
				disabled={controlsDisabled}
			/>
		</label>

		<label>
			<span>{t("searchProfiles.tags")}</span>
			<textarea
				rows="2"
				bind:value={tagsText}
				oninput={handleTagsInput}
				disabled={controlsDisabled}
			></textarea>
			<small>{t("searchProfiles.tagsHint")}</small>
		</label>

		<label>
			<span>{t("searchProfiles.except")}</span>
			<textarea
				rows="2"
				bind:value={exceptText}
				oninput={handleExceptInput}
				disabled={controlsDisabled}
			></textarea>
			<small>{t("searchProfiles.exceptHint")}</small>
		</label>

		<div class="field-row">
		<label>
			<span>{t("searchProfiles.sort")}</span>
			<select
				value={sortDisplayValue}
				onchange={(event) =>
					handleSelectChange(
						"sort",
						(event.currentTarget as HTMLSelectElement).value,
					)
				}
				disabled={controlsDisabled || sortLocked}
			>
			{#each sortOptions as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
			<small
				class="field-hint"
				data-visible={sortLocked}
				aria-live="polite"
			>
				{t("searchProfiles.sortForcedByRecent")}
			</small>
		</label>

		<label>
			<span>{t("searchProfiles.adult")}</span>
			<select
				value={profile.adult}
				onchange={(event) => handleSelectChange("adult", (event.currentTarget as HTMLSelectElement).value)}
				disabled={controlsDisabled}
			>
					{#each adultOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="field-row">
			<label>
				<span>{t("searchProfiles.minPrice")}</span>
				<input
					type="number"
					min="1"
					step="1"
					placeholder={t("searchProfiles.priceHint")}
					value={profile.minPrice ?? ""}
					oninput={(event) => handlePriceInput("minPrice", event)}
					disabled={controlsDisabled}
				/>
			</label>
			<label>
				<span>{t("searchProfiles.maxPrice")}</span>
				<input
					type="number"
					min="1"
					step="1"
					placeholder={t("searchProfiles.priceHint")}
					value={profile.maxPrice ?? ""}
					oninput={(event) => handlePriceInput("maxPrice", event)}
					disabled={controlsDisabled}
				/>
			</label>
		</div>

			<div class="checkbox-grid">
		<label>
			<input
				type="checkbox"
				checked={profile.inStockOnly}
				onchange={(event) => handleCheckboxChange("inStockOnly", (event.currentTarget as HTMLInputElement).checked)}
				disabled={controlsDisabled}
			/>
					<span>{t("searchProfiles.inStockOnly")}</span>
				</label>
		<label>
			<input
				type="checkbox"
				checked={profile.recentOnly}
				onchange={(event) => handleCheckboxChange("recentOnly", (event.currentTarget as HTMLInputElement).checked)}
				disabled={controlsDisabled}
			/>
					<span>{t("searchProfiles.recentOnly")}</span>
				</label>
			</div>
	</div>
</div>

<!--
  App.svelte - ポップアップUIのルートコンポーネント

  拡張機能の設定画面を提供し、以下の機能を管理:
  - ブロック済みショップ一覧の表示・解除
  - 自動リダイレクト設定
  - 無限スクロール設定
  - セクション非表示設定
  - 検索プロファイル設定
-->
<script lang="ts">
import { onDestroy, onMount } from "svelte";
import type {
	BlockedShop,
	BoothDarkModeSettings,
	HiddenSections,
	MultiSearchProfileSettings,
	NamedSearchProfile,
	ThemeMode,
} from "@/app/storage";
import {
	autoRedirectToSearch,
	blockedShops,
	boothDarkMode as boothDarkModeStore,
	hiddenSections,
	infiniteScrollEnabled,
	multiSearchProfiles as multiSearchProfilesStore,
	themeMode as themeModeStore,
} from "@/app/storage";
import { TIMEOUTS } from "@/config/constants";
import { shopNameSchema } from "@/features/shop-blocker/schemas";
import { toggleShopInList } from "@/features/shop-blocker/shopBlockControls";
import { blockedShopListSchema, hiddenSectionsSchema } from "@/shared/schema";
import type { LanguageSearchProfile } from "@/shared/search";
import {
	createDefaultNamedProfile,
	MAX_PROFILES,
	normalizeMultiProfileSettings,
	sanitizeArray,
	sanitizeNamedProfile,
} from "@/shared/search";
import { isBoothDomain } from "@/shared/url";
import { t } from "@/utils/i18n";
import BlockedShopsSection from "./components/BlockedShopsSection.svelte";
import SearchProfileSection from "./components/SearchProfileSection.svelte";
import SectionHiderSection from "./components/SectionHiderSection.svelte";
import SettingsSection from "./components/SettingsSection.svelte";

// ========================
// 状態管理
// ========================
let blocked = $state<BlockedShop[]>([]);
let autoRedirect = $state(false);
let infiniteScroll = $state(false);
let sections = $state<HiddenSections>({
	categoryResults: false,
	recentlyViewed: false,
});
let initialized = $state(false);
let multiProfilesData = $state<MultiSearchProfileSettings | null>(null);
let selectedProfileId = $state<string | null>(null);
let draftProfile = $state<NamedSearchProfile | null>(null);
let profilesReady = $state(false);
let profileSaveQueue: Promise<void> = Promise.resolve();
let pendingProfileSave: MultiSearchProfileSettings | null = null;
let saveTimeout: number | null = null;
let shouldReloadActiveBoothTab = false;
let lastInfiniteScrollState: boolean | null = null;
let lastSectionsSnapshot: HiddenSections | null = null;
let currentTheme = $state<ThemeMode>("system");
let boothDarkModeEnabled = $state(false);
let boothDarkModeMode = $state<ThemeMode>("system");

// ========================
// ブラウザAPI型定義
// ========================
type TabLike = { id?: number; url?: string };
type QueryInfo = { active: true; currentWindow: true };

const extensionBrowser = (
	globalThis as {
		browser?: {
			tabs?: {
				query?: (info: QueryInfo) => Promise<TabLike[]>;
				reload?: (tabId?: number) => Promise<void> | void;
			};
		};
	}
).browser;
const chromeAPI = (
	globalThis as {
		chrome?: {
			tabs?: {
				query?: (info: QueryInfo, callback: (tabs: TabLike[]) => void) => void;
				reload?: (tabId?: number) => void;
			};
		};
	}
).chrome;

// ========================
// ヘルパー関数
// ========================

/** MultiSearchProfileSettingsのディープコピーを作成 */
function cloneMultiProfiles(
	value: MultiSearchProfileSettings,
): MultiSearchProfileSettings {
	return JSON.parse(JSON.stringify(value)) as MultiSearchProfileSettings;
}

/** NamedSearchProfileのディープコピーを作成 */
function cloneProfile(value: NamedSearchProfile): NamedSearchProfile {
	return JSON.parse(JSON.stringify(value)) as NamedSearchProfile;
}

/** プロファイルをストレージに保存（キューイング処理） */
function commitProfileSave(snapshot: MultiSearchProfileSettings): void {
	profileSaveQueue = profileSaveQueue
		.catch(() => {
			// swallow previous rejection to keep the chain alive
		})
		.then(async () => {
			await multiSearchProfilesStore.setValue(snapshot);
		})
		.catch((error) => {
			console.error("Failed to persist search profiles", error);
		});
}

/** プロファイル保存をデバウンス（600ms後に実行） */
function scheduleProfileSave(snapshot: MultiSearchProfileSettings): void {
	pendingProfileSave = snapshot;
	if (saveTimeout !== null) {
		clearTimeout(saveTimeout);
	}

	const flush = () => {
		saveTimeout = null;
		if (!pendingProfileSave) return;
		const payload = pendingProfileSave;
		pendingProfileSave = null;
		commitProfileSave(payload);
	};

	if (typeof window === "undefined") {
		flush();
		return;
	}

	saveTimeout = window.setTimeout(flush, TIMEOUTS.PROFILE_SAVE_DEBOUNCE_MS);
}

/** 保留中のプロファイル保存を即座に実行 */
function flushPendingProfileSave(): void {
	if (saveTimeout !== null) {
		clearTimeout(saveTimeout);
		saveTimeout = null;
	}
	if (!pendingProfileSave) {
		return;
	}
	const payload = pendingProfileSave;
	pendingProfileSave = null;
	commitProfileSave(payload);
}

/** 2つのMultiSearchProfileSettingsが等しいかどうかを比較 */
function areMultiProfileSettingsEqual(
	a: MultiSearchProfileSettings,
	b: MultiSearchProfileSettings,
): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

/** 選択中のプロファイルを取得 */
function getSelectedProfile(): NamedSearchProfile | null {
	if (!multiProfilesData || !selectedProfileId) {
		return null;
	}
	return (
		multiProfilesData.profiles.find((p) => p.id === selectedProfileId) ?? null
	);
}

// ========================
// 算出プロパティとリアクティブ処理
// ========================
let isProfileDirty = $state(false);

$effect(() => {
	const selectedProfile = getSelectedProfile();
	if (!multiProfilesData || !draftProfile || !selectedProfile) {
		isProfileDirty = false;
		return;
	}
	isProfileDirty =
		JSON.stringify(draftProfile) !== JSON.stringify(selectedProfile);
});

// リアクティブ自動保存（初期化完了後のみ発火）
$effect(() => {
	if (initialized) {
		autoRedirectToSearch.setValue(autoRedirect);
	}
});

$effect(() => {
	if (!initialized) {
		return;
	}
	const previous = lastInfiniteScrollState;
	lastInfiniteScrollState = infiniteScroll;
	if (previous !== null && previous !== infiniteScroll) {
		shouldReloadActiveBoothTab = true;
	}
	infiniteScrollEnabled.setValue(infiniteScroll);
});

$effect(() => {
	if (!initialized) {
		return;
	}
	const nextSections = hiddenSectionsSchema.parse(sections);
	const changed =
		lastSectionsSnapshot !== null &&
		(lastSectionsSnapshot.categoryResults !== nextSections.categoryResults ||
			lastSectionsSnapshot.recentlyViewed !== nextSections.recentlyViewed);
	lastSectionsSnapshot = { ...nextSections };
	if (changed) {
		shouldReloadActiveBoothTab = true;
	}
	hiddenSections.setValue(nextSections);
});

// Boothダークモード設定の自動保存
$effect(() => {
	if (!initialized) {
		return;
	}
	boothDarkModeStore.setValue({
		enabled: boothDarkModeEnabled,
		mode: boothDarkModeMode,
	});
	// ダークモード変更時はBoothタブをリロード
	shouldReloadActiveBoothTab = true;
});

// ========================
// テーマ関連
// ========================

/** テーマをDOMに適用 */
function applyTheme(theme: ThemeMode): void {
	document.documentElement.setAttribute("data-theme", theme);
}

/** テーマ変更ハンドラ */
function handleThemeChange(event: Event): void {
	const target = event.currentTarget as HTMLSelectElement;
	const newTheme = target.value as ThemeMode;
	currentTheme = newTheme;
	applyTheme(newTheme);
	themeModeStore.setValue(newTheme);
}

// ========================
// ライフサイクル
// ========================
onMount(async () => {
	const [
		blockedResult,
		autoRedirectResult,
		infiniteScrollResult,
		sectionsResult,
		multiProfilesResult,
		themeModeResult,
		boothDarkModeResult,
	] = await Promise.all([
		blockedShops.getValue(),
		autoRedirectToSearch.getValue(),
		infiniteScrollEnabled.getValue(),
		hiddenSections.getValue(),
		multiSearchProfilesStore.getValue(),
		themeModeStore.getValue(),
		boothDarkModeStore.getValue(),
	]);

	blocked = blockedResult;
	autoRedirect = autoRedirectResult;
	infiniteScroll = infiniteScrollResult;
	sections = sectionsResult;
	let normalizedProfiles = normalizeMultiProfileSettings(multiProfilesResult);

	// プロファイルが空の場合はデフォルトプロファイルを作成
	if (normalizedProfiles.profiles.length === 0) {
		const defaultProfile = createDefaultNamedProfile("Default");
		normalizedProfiles = {
			...normalizedProfiles,
			profiles: [defaultProfile],
			activeProfileId: defaultProfile.id,
		};
		// 初期プロファイルを保存
		void multiSearchProfilesStore.setValue(normalizedProfiles);
	}

	multiProfilesData = normalizedProfiles;
	selectedProfileId = normalizedProfiles.activeProfileId;
	const activeProfile =
		normalizedProfiles.profiles.find(
			(p) => p.id === normalizedProfiles.activeProfileId,
		) ?? normalizedProfiles.profiles[0];
	if (activeProfile) {
		draftProfile = cloneProfile(activeProfile);
		selectedProfileId = activeProfile.id;
	}
	profilesReady = true;
	currentTheme = themeModeResult;
	applyTheme(themeModeResult);

	// Boothダークモード設定を読み込む
	boothDarkModeEnabled = boothDarkModeResult.enabled;
	boothDarkModeMode = boothDarkModeResult.mode;

	// 初期化完了フラグを立てる
	initialized = true;
});

// ========================
// アクション
// ========================

/** ブロックリストからショップを削除 */
const removeShop = async (name: string) => {
	const parsed = shopNameSchema.safeParse(name);
	if (!parsed.success) {
		console.warn("Invalid shop name", { name, issues: parsed.error.issues });
		return;
	}
	blocked = blockedShopListSchema.parse(
		toggleShopInList(blocked, parsed.data, false),
	);
	await blockedShops.setValue(blocked);
};

/** プロファイル設定を更新し保存をスケジュール */
function updateMultiProfiles(
	mutator: (draft: MultiSearchProfileSettings) => void,
	options?: { markNeedsReload?: boolean },
): void {
	if (!multiProfilesData) return;
	const next = cloneMultiProfiles(multiProfilesData);
	mutator(next);
	const normalized = normalizeMultiProfileSettings(next);
	if (areMultiProfileSettingsEqual(normalized, multiProfilesData)) {
		return;
	}
	multiProfilesData = normalized;
	// アクティブプロファイルが変わった場合はドラフトも更新
	const activeProfile = normalized.profiles.find(
		(p) => p.id === normalized.activeProfileId,
	);
	if (activeProfile) {
		selectedProfileId = activeProfile.id;
		draftProfile = cloneProfile(activeProfile);
	}
	scheduleProfileSave(normalized);
	if (options?.markNeedsReload ?? true) {
		shouldReloadActiveBoothTab = true;
	}
}

onDestroy(() => {
	flushPendingProfileSave();
	if (shouldReloadActiveBoothTab) {
		void reloadActiveBoothTab();
	}
});

/** プロファイルフィールドの変更を処理（ドラフトを更新） */
const handleProfileChange = (changes: Partial<LanguageSearchProfile>): void => {
	if (!draftProfile) return;
	const normalized: Partial<LanguageSearchProfile> = { ...changes };
	if (typeof changes.keyword === "string") {
		normalized.keyword = changes.keyword;
	}
	if (changes.tags) {
		normalized.tags = sanitizeArray(changes.tags);
	}
	if (changes.exceptWords) {
		normalized.exceptWords = sanitizeArray(changes.exceptWords);
	}
	draftProfile = {
		...draftProfile,
		...normalized,
	};
};

/** ドラフトを保存（変更がある場合のみ） */
function saveProfileDraft(): void {
	if (
		!multiProfilesData ||
		!draftProfile ||
		!selectedProfileId ||
		!isProfileDirty
	) {
		return;
	}
	const profileSnapshot = cloneProfile(draftProfile);
	updateMultiProfiles((draft) => {
		const idx = draft.profiles.findIndex((p) => p.id === selectedProfileId);
		if (idx !== -1) {
			draft.profiles[idx] = profileSnapshot;
		}
	});
}

/** ドラフトを保存済みの状態にリセット */
function resetProfileDraft(): void {
	const selectedProfile = getSelectedProfile();
	if (!selectedProfile) {
		return;
	}
	draftProfile = cloneProfile(selectedProfile);
}

/** プロファイル有効/無効トグルの処理 */
const handleProfilesEnabledToggle = (value: boolean): void => {
	updateMultiProfiles((draft) => {
		draft.enabled = value;
	});
};

/** プロファイル選択の処理 */
function handleProfileSelect(profileId: string): void {
	if (!multiProfilesData) return;
	const profile = multiProfilesData.profiles.find((p) => p.id === profileId);
	if (!profile) return;

	// 未保存の変更があれば破棄を確認
	if (isProfileDirty) {
		// 変更を破棄して切り替え
	}

	selectedProfileId = profileId;
	draftProfile = cloneProfile(profile);
	updateMultiProfiles((draft) => {
		draft.activeProfileId = profileId;
	});
}

/** 新しいプロファイルを作成 */
function handleCreateProfile(): void {
	if (!multiProfilesData) return;
	if (multiProfilesData.profiles.length >= MAX_PROFILES) {
		return; // 上限に達している
	}

	const newProfile = createDefaultNamedProfile();
	updateMultiProfiles((draft) => {
		draft.profiles.push(newProfile);
		draft.activeProfileId = newProfile.id;
	});
}

/** プロファイルを削除 */
function handleDeleteProfile(profileId: string): void {
	if (!multiProfilesData) return;
	if (multiProfilesData.profiles.length <= 1) {
		return; // 最後の1つは削除不可
	}

	updateMultiProfiles((draft) => {
		const idx = draft.profiles.findIndex((p) => p.id === profileId);
		if (idx === -1) return;
		draft.profiles.splice(idx, 1);
		// 削除されたプロファイルがアクティブだった場合、最初のプロファイルをアクティブに
		if (draft.activeProfileId === profileId) {
			draft.activeProfileId = draft.profiles[0]?.id ?? null;
		}
	});
}

/** プロファイル名の変更 */
function handleProfileNameChange(name: string): void {
	if (!draftProfile) return;
	draftProfile = {
		...draftProfile,
		name,
	};
}

/** URLがBooth.pmドメインかどうかを判定 */
function isBoothUrl(url: string | null | undefined): boolean {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		return isBoothDomain(parsed);
	} catch {
		return false;
	}
}

/** アクティブなBoothタブをリロード（設定変更反映用） */
async function reloadActiveBoothTab(): Promise<void> {
	try {
		if (extensionBrowser?.tabs?.query) {
			const [tab] = await extensionBrowser.tabs.query({
				active: true,
				currentWindow: true,
			});
			if (!tab || !isBoothUrl(tab.url)) {
				return;
			}
			const tabId = typeof tab.id === "number" ? tab.id : undefined;
			if (extensionBrowser.tabs.reload) {
				await extensionBrowser.tabs.reload(tabId);
			}
			return;
		}
		if (chromeAPI?.tabs?.query && chromeAPI.tabs.reload) {
			const tabs = await new Promise<TabLike[]>((resolve) => {
				chromeAPI.tabs?.query?.({ active: true, currentWindow: true }, resolve);
			});
			const tab = tabs[0];
			if (!tab || !isBoothUrl(tab.url)) {
				return;
			}
			chromeAPI.tabs.reload(tab.id);
		}
	} catch (error) {
		console.warn("Failed to reload active Booth tab", error);
	}
}
</script>

<main>
	<header class="header">
		<h1 class="header-title">{t("popup.title")}</h1>
		<select class="theme-select" value={currentTheme} onchange={handleThemeChange}>
			<option value="light">{t("settings.themeOptions.light")}</option>
			<option value="dark">{t("settings.themeOptions.dark")}</option>
			<option value="system">{t("settings.themeOptions.system")}</option>
		</select>
	</header>

	<div class="content">
		<!-- 基本設定セクション -->
		<SettingsSection
			{autoRedirect}
			{infiniteScroll}
			{boothDarkModeEnabled}
			onAutoRedirectChange={(v) => autoRedirect = v}
			onInfiniteScrollChange={(v) => infiniteScroll = v}
			onBoothDarkModeChange={(v) => boothDarkModeEnabled = v}
		/>

	{#if profilesReady && multiProfilesData && draftProfile}
		<!-- 検索プロファイルセクション -->
		<section class="section">
			<div class="section-header">
				<h2 class="section-title">{t("searchProfile.title")}</h2>
				<div class="profile-controls">
					<select
						class="profile-select"
						value={selectedProfileId}
						onchange={(e) => handleProfileSelect((e.currentTarget as HTMLSelectElement).value)}
					>
						{#each multiProfilesData.profiles as profile}
							<option value={profile.id}>{profile.name}</option>
						{/each}
					</select>
					<button
						class="icon-btn"
						onclick={handleCreateProfile}
						disabled={multiProfilesData.profiles.length >= MAX_PROFILES}
						title={t("searchProfile.addProfile")}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<path d="M12 5v14M5 12h14"/>
						</svg>
					</button>
					<button
						class="icon-btn danger"
						onclick={() => selectedProfileId && handleDeleteProfile(selectedProfileId)}
						disabled={multiProfilesData.profiles.length <= 1}
						title={t("searchProfile.deleteProfile")}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<path d="M18 6L6 18M6 6l12 12"/>
						</svg>
					</button>
				</div>
			</div>
			<div class="profile-name-field">
				<input
					type="text"
					value={draftProfile.name}
					oninput={(e) => handleProfileNameChange((e.currentTarget as HTMLInputElement).value)}
					placeholder={t("searchProfile.profileNamePlaceholder")}
				/>
			</div>
		</section>
		<SearchProfileSection
			profile={draftProfile}
			enabled={multiProfilesData.enabled}
			onProfileChange={handleProfileChange}
			onToggleEnabled={handleProfilesEnabledToggle}
			isDirty={isProfileDirty}
			onSave={saveProfileDraft}
			onReset={resetProfileDraft}
		/>
	{/if}

		<!-- セクション非表示 -->
		<SectionHiderSection
			{sections}
			onSectionsChange={(s) => sections = s}
		/>

		<!-- ブロック済みショップ -->
		<BlockedShopsSection
			{blocked}
			onUnblock={removeShop}
		/>
	</div>
</main>

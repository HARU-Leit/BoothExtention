/**
 * バックグラウンドスクリプト
 *
 * 以下の機能を提供:
 * - ホームページから検索ページへの自動リダイレクト
 * - declarativeNetRequestによるトラッキングブロック
 * - ストレージ変更の監視とルール更新
 */
import { autoRedirectToSearch, multiSearchProfiles } from "@/app/storage";
import { RULE_ID_RANGES } from "@/config/constants";
import { TrackingBlocker } from "@/features/tracking-blocker/TrackingBlocker";
import {
	buildAbsoluteSearchUrl,
	createDefaultMultiProfileSettings,
	DEFAULT_SEARCH_PROFILE_LOCALE,
	getActiveProfile,
	type MultiSearchProfileSettings,
} from "@/shared/search";
import {
	BOOTH_PATH_LOCALES,
	type BoothPathLocale,
} from "@/shared/url/boothUrl";

// ========================
// 定数定義
// ========================
const BOOTH_DOMAIN = "booth.pm";
const BOOTH_BASE_URL = `https://${BOOTH_DOMAIN}`;
const BASE_REDIRECT_RULE_ID = RULE_ID_RANGES.REDIRECT.START;
const ROUTE_SOURCES = [
	{ kind: "root" } as const,
	...BOOTH_PATH_LOCALES.map(
		(locale): RedirectSource => ({ kind: "locale", locale }),
	),
] as const satisfies readonly RedirectSource[];
const REDIRECT_RULE_IDS = ROUTE_SOURCES.map(
	(_, index) => BASE_REDIRECT_RULE_ID + index,
);

// ========================
// 状態管理
// ========================
let cachedProfiles: MultiSearchProfileSettings =
	createDefaultMultiProfileSettings();
let redirectEnabled = false;

// ========================
// 型定義
// ========================

/** リダイレクト元の種類 */
type RedirectSource =
	| { kind: "root" }
	| { kind: "locale"; locale: BoothPathLocale };

/** リダイレクトルールの記述子 */
interface RedirectRuleDescriptor {
	readonly id: number;
	readonly pattern: string;
	readonly targetUrl: string;
}

// ========================
// メインエントリーポイント
// ========================
export default defineBackground({
	main(): void {
		console.log("Booth Optimizer Background: 準備完了");

		initRedirectRules();
		initTrackingBlocker();

		autoRedirectToSearch.watch((enabled) => {
			redirectEnabled = enabled;
			void updateRedirectRules(redirectEnabled, cachedProfiles);
		});

		multiSearchProfiles.watch((profiles) => {
			cachedProfiles = profiles;
			if (redirectEnabled) {
				void updateRedirectRules(true, cachedProfiles);
			}
		});
	},
});

// ========================
// リダイレクトルール管理
// ========================

/** 初期リダイレクトルールを設定 */
async function initRedirectRules(): Promise<void> {
	const [enabled, profiles] = await Promise.all([
		autoRedirectToSearch.getValue(),
		multiSearchProfiles.getValue(),
	]);
	redirectEnabled = enabled;
	cachedProfiles = profiles;
	await updateRedirectRules(redirectEnabled, cachedProfiles);
}

/**
 * リダイレクトルールを更新
 *
 * BOOTHホームを各ロケールの検索ページへリダイレクトする
 * 動的ルールを有効/無効にする
 */
async function updateRedirectRules(
	enabled: boolean,
	profiles: MultiSearchProfileSettings,
): Promise<void> {
	if (enabled) {
		const descriptors = buildRedirectRuleDescriptors(profiles);
		const rules = descriptors.map(({ id, pattern, targetUrl }) =>
			createRedirectRule(id, pattern, targetUrl),
		);
		await browser.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: REDIRECT_RULE_IDS,
			addRules: rules,
		});
		console.log("✅ Home redirect rules enabled for all languages");
	} else {
		await browser.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: REDIRECT_RULE_IDS,
		});
		console.log("❌ Home redirect rules disabled");
	}
}

/** declarativeNetRequest用のリダイレクトルールを生成 */
function createRedirectRule(
	id: number,
	regexFilter: string,
	targetUrl: string,
): browser.declarativeNetRequest.Rule {
	return {
		id,
		priority: 1,
		action: {
			type: "redirect",
			redirect: { url: targetUrl },
		},
		condition: {
			regexFilter,
			resourceTypes: ["main_frame"],
		},
	};
}

// ========================
// トラッキングブロッカー
// ========================

/** トラッキングブロッカーを初期化 */
async function initTrackingBlocker(): Promise<void> {
	const blocker = new TrackingBlocker({ enabled: true });
	await blocker.init();
}

// ========================
// ヘルパー関数
// ========================

/** 全ロケール用のリダイレクトルール記述子を構築 */
function buildRedirectRuleDescriptors(
	profiles: MultiSearchProfileSettings,
): RedirectRuleDescriptor[] {
	return ROUTE_SOURCES.map((source, index) => {
		const locale =
			source.kind === "root" ? resolveDefaultLocale() : source.locale;
		return {
			id: BASE_REDIRECT_RULE_ID + index,
			pattern: buildSourcePattern(source),
			targetUrl: getLocaleTargetUrl(locale, profiles),
		};
	});
}

/** ロケールに応じたリダイレクト先URLを取得 */
function getLocaleTargetUrl(
	locale: BoothPathLocale,
	settings: MultiSearchProfileSettings,
): string {
	if (!settings.enabled) {
		return `${BOOTH_BASE_URL}/${locale}/items`;
	}
	const profile = getActiveProfile(settings);
	if (!profile) {
		return `${BOOTH_BASE_URL}/${locale}/items`;
	}
	return buildAbsoluteSearchUrl(locale, profile, {
		origin: BOOTH_BASE_URL,
		page: 1,
	});
}

/** デフォルトロケールを解決 */
function resolveDefaultLocale(): BoothPathLocale {
	return DEFAULT_SEARCH_PROFILE_LOCALE;
}

/** リダイレクト元URLパターンを構築 */
function buildSourcePattern(source: RedirectSource): string {
	const domainRegex = escapeRegex(BOOTH_DOMAIN);
	switch (source.kind) {
		case "root":
			return `^https?://${domainRegex}/?$`;
		case "locale":
			return `^https?://${domainRegex}/${source.locale}/?$`;
	}
}

/** 正規表現の特殊文字をエスケープ */
function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

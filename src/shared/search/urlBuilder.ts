import type { LanguageSearchProfile } from "@/shared/search";
import {
	DEFAULT_SEARCH_PROFILE_LOCALE,
	DEFAULT_SEARCH_SORT,
	getEffectiveSort,
	sanitizeArray,
	sanitizePrice,
} from "@/shared/search";
import {
	BOOTH_PATH_LOCALES,
	type BoothPathLocale,
	extractBoothPathLocale,
	getCurrentOrigin,
} from "@/shared/url";

/** 検索URL生成オプション */
export interface BuildSearchUrlOptions {
	/** ページ番号（省略時はページパラメータなし） */
	page?: number | null;
}

/** ロケールをエスケープしてOR結合 */
const escapedLocales = BOOTH_PATH_LOCALES.map((locale) =>
	locale.replace(/[-/\\^$*+?.()|[\]{}]/gu, "\\$&"),
).join("|");

/** ショップ一覧パスにマッチする正規表現 */
const SHOP_LISTING_REGEX = new RegExp(
	`^/(?<locale>${escapedLocales})/(?<section>items|search)(?:/(?<keyword>[^/?#]+))?/?$`,
	"i",
);

/** ショップ一覧の種類 */
type ShopListingKind = "items" | "search";

/** パース済みショップ一覧パス */
export interface ParsedShopListingPath {
	/** パスのロケール */
	locale: BoothPathLocale;
	/** 一覧の種類（items: 全商品, search: 検索結果） */
	kind: ShopListingKind;
	/** 検索キーワード（searchの場合のみ） */
	keyword?: string;
}

/**
 * ショップ一覧パスをパース
 *
 * /ja/items や /en/search/keyword 形式のパスを解析する
 *
 * @param pathname - パースするパス名
 * @returns パース結果、または無効なパスの場合はnull
 */
export function parseShopListingPath(
	pathname: string,
): ParsedShopListingPath | null {
	const match = pathname.match(SHOP_LISTING_REGEX);
	if (!match || !match.groups) {
		return null;
	}

	const locale = match.groups.locale.toLowerCase() as BoothPathLocale;
	const section = match.groups.section.toLowerCase() as ShopListingKind;
	if (!BOOTH_PATH_LOCALES.includes(locale)) {
		return null;
	}

	if (section === "items") {
		if (
			typeof match.groups.keyword === "string" &&
			match.groups.keyword.length > 0
		) {
			return null;
		}
		return { locale, kind: "items" };
	}

	const rawKeyword = match.groups.keyword;
	if (!rawKeyword) {
		return null;
	}

	return {
		locale,
		kind: "search",
		keyword: decodeURIComponent(rawKeyword),
	};
}

/**
 * パスがショップ一覧ページかどうかを判定
 * @param pathname - 判定するパス名
 * @returns ショップ一覧パスの場合はtrue
 */
export function isShopListingPath(pathname: string): boolean {
	return parseShopListingPath(pathname) !== null;
}

/**
 * 検索プロファイルから相対URLを生成
 *
 * プロファイルの設定に基づいて検索URLを構築する
 *
 * @param locale - 使用するロケール
 * @param profile - 検索プロファイル
 * @param options - 追加オプション（ページ番号など）
 * @returns 生成された相対URL
 */
export function buildRelativeSearchUrl(
	locale: BoothPathLocale,
	profile: LanguageSearchProfile,
	options?: BuildSearchUrlOptions,
): string {
	const trimmedKeyword = profile.keyword.trim();
	const path =
		trimmedKeyword.length > 0
			? `/${locale}/search/${encodeURIComponent(trimmedKeyword)}`
			: `/${locale}/items`;

	const params = new URLSearchParams();
	const effectiveSort = getEffectiveSort(profile);
	if (effectiveSort !== DEFAULT_SEARCH_SORT) {
		params.set("sort", effectiveSort);
	}

	if (profile.inStockOnly) {
		params.set("in_stock", "true");
	}

	if (profile.recentOnly) {
		params.set("new_arrival", "on");
	}

	if (profile.adult !== "absent") {
		params.set("adult", profile.adult);
	}

	for (const word of sanitizeArray(profile.exceptWords)) {
		params.append("except_words[]", word);
	}

	for (const tag of sanitizeArray(profile.tags)) {
		params.append("tags[]", tag);
	}

	const minPrice = sanitizePrice(profile.minPrice);
	const maxPrice = sanitizePrice(profile.maxPrice);
	if (minPrice !== null) {
		params.set("min_price", minPrice.toString());
	}
	if (maxPrice !== null) {
		params.set("max_price", maxPrice.toString());
	}

	if (typeof options?.page === "number" && Number.isFinite(options.page)) {
		const pageValue = Math.max(1, Math.trunc(options.page));
		params.set("page", pageValue.toString());
	}

	const query = params.toString();
	return query ? `${path}?${query}` : path;
}

/**
 * 検索プロファイルから絶対URLを生成
 *
 * @param locale - 使用するロケール
 * @param profile - 検索プロファイル
 * @param options - 追加オプション（ページ番号、origin）
 * @returns 生成された絶対URL
 */
export function buildAbsoluteSearchUrl(
	locale: BoothPathLocale,
	profile: LanguageSearchProfile,
	options?: BuildSearchUrlOptions & { origin?: string },
): string {
	const origin = (options?.origin ?? getCurrentOrigin()).replace(/\/$/u, "");
	const relative = buildRelativeSearchUrl(locale, profile, options);
	return `${origin}${relative}`;
}

// ========================================
// URL とプロファイルの比較用ヘルパー関数群
// ========================================

/**
 * 配列を正規化
 * @param value - 正規化する配列
 */
function normalizeArray(value: readonly string[]): string[] {
	return sanitizeArray(value);
}

/**
 * 配列の等価性を比較
 * @param a - 比較する配列1
 * @param b - 比較する配列2
 */
function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
	if (a.length !== b.length) {
		return false;
	}
	return a.every((value, index) => value === b[index]);
}

/**
 * URLSearchParamsから配列パラメータを取得
 * @param params - URLSearchParams
 * @param key - パラメータ名
 */
function getParamArray(params: URLSearchParams, key: string): string[] {
	return params
		.getAll(key)
		.map((value) => value.trim())
		.filter((value) => value.length > 0);
}

/** "true", "1", "on" を真として扱う */
function isTruthy(value: string | null): boolean {
	if (!value) return false;
	const normalized = value.toLowerCase();
	return normalized === "true" || normalized === "1" || normalized === "on";
}

/** パスとキーワードがプロファイルと一致するか */
function matchesPathAndKeyword(
	parsed: ParsedShopListingPath,
	locale: BoothPathLocale,
	keyword: string,
): boolean {
	if (parsed.locale !== locale) {
		return false;
	}

	if (keyword.length === 0) {
		// キーワードなし → /items ページであるべき
		return parsed.kind === "items";
	}

	// キーワードあり → /search/keyword ページで、キーワードが一致するべき
	return parsed.kind === "search" && parsed.keyword === keyword;
}

/** ソート順がプロファイルと一致するか */
function matchesSort(
	params: URLSearchParams,
	profile: LanguageSearchProfile,
): boolean {
	const sortParam = params.get("sort");
	const expectedSort = getEffectiveSort(profile);

	// パラメータが無い場合はデフォルト(new)として扱う
	return (
		sortParam === expectedSort ||
		(!sortParam && expectedSort === DEFAULT_SEARCH_SORT)
	);
}

/** ブール値フラグ（in_stock, new_arrival）がプロファイルと一致するか */
function matchesBooleanFlag(
	params: URLSearchParams,
	paramName: string,
	profileValue: boolean,
	useTruthy = false,
): boolean {
	const paramValue = params.get(paramName);

	if (profileValue) {
		// プロファイルが有効 → パラメータも有効であるべき
		return useTruthy ? isTruthy(paramValue) : paramValue === "true";
	}

	// プロファイルが無効 → パラメータも無効であるべき
	return useTruthy ? !isTruthy(paramValue) : paramValue !== "true";
}

/** adult フィルタがプロファイルと一致するか */
function matchesAdultFilter(
	params: URLSearchParams,
	adult: LanguageSearchProfile["adult"],
): boolean {
	const adultParam = params.get("adult");

	if (adult === "absent") {
		// absent → パラメータが無いべき
		return adultParam === null;
	}

	// include/only → パラメータが一致するべき
	return adultParam === adult;
}

/** 配列パラメータ（tags[], except_words[]）がプロファイルと一致するか */
function matchesArrayParam(
	params: URLSearchParams,
	paramName: string,
	profileArray: readonly string[],
): boolean {
	const expected = normalizeArray(profileArray);
	const current = getParamArray(params, paramName);
	return arraysEqual(current, expected);
}

/** 価格パラメータがプロファイルと一致するか */
function matchesPriceParam(
	params: URLSearchParams,
	paramName: string,
	profileValue: number | null,
): boolean {
	const paramValue = params.get(paramName);
	const sanitized = sanitizePrice(profileValue);

	if (sanitized === null) {
		return paramValue === null;
	}

	return paramValue === sanitized.toString();
}

/**
 * URLが検索プロファイルと完全に一致するかを判定
 *
 * 以下の項目すべてが一致する場合に true を返す:
 * - パス（ロケールとキーワード）
 * - ソート順
 * - 在庫あり（in_stock）
 * - 新着のみ（new_arrival）
 * - 年齢制限フィルタ（adult）
 * - タグ（tags[]）
 * - 除外ワード（except_words[]）
 * - 最低価格（min_price）
 * - 最高価格（max_price）
 */
export function urlMatchesProfile(
	url: URL,
	locale: BoothPathLocale,
	profile: LanguageSearchProfile,
): boolean {
	// 1. パスの解析
	const parsed = parseShopListingPath(url.pathname);
	if (!parsed) {
		return false;
	}

	// 2. パスとキーワードの一致
	const keyword = profile.keyword.trim();
	if (!matchesPathAndKeyword(parsed, locale, keyword)) {
		return false;
	}

	const params = url.searchParams;

	// 3. ソート順の一致
	if (!matchesSort(params, profile)) {
		return false;
	}

	// 4. ブールフラグの一致
	if (!matchesBooleanFlag(params, "in_stock", profile.inStockOnly)) {
		return false;
	}
	if (!matchesBooleanFlag(params, "new_arrival", profile.recentOnly, true)) {
		return false;
	}

	// 5. 年齢制限フィルタの一致
	if (!matchesAdultFilter(params, profile.adult)) {
		return false;
	}

	// 6. 配列パラメータの一致
	if (!matchesArrayParam(params, "tags[]", profile.tags)) {
		return false;
	}
	if (!matchesArrayParam(params, "except_words[]", profile.exceptWords)) {
		return false;
	}

	// 7. 価格パラメータの一致
	if (!matchesPriceParam(params, "min_price", profile.minPrice)) {
		return false;
	}
	if (!matchesPriceParam(params, "max_price", profile.maxPrice)) {
		return false;
	}

	return true;
}

/**
 * パス名からロケールを選択
 *
 * パスからロケールを抽出し、見つからない場合はデフォルトを返す
 *
 * @param pathname - パス名
 * @returns 検出されたロケール、またはデフォルトロケール
 */
export function pickLocaleForPath(pathname: string): BoothPathLocale {
	const detected = extractBoothPathLocale(pathname);
	if (detected) {
		return detected;
	}
	return DEFAULT_SEARCH_PROFILE_LOCALE;
}

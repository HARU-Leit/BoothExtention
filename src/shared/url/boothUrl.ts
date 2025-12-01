import { z } from "zod/mini";

const ITEM_PAGE_REGEX = /\/items\/\d+/;
const BOOTH_HOST_SUFFIX = "booth.pm";

/** Booth.pmがサポートするパスロケール */
export const BOOTH_PATH_LOCALES = ["ja", "ko", "en", "zh-cn", "zh-tw"] as const;

/** パスロケールの型 */
export type BoothPathLocale = (typeof BOOTH_PATH_LOCALES)[number];

const boothPathLocaleSchema = z.enum(BOOTH_PATH_LOCALES);

/**
 * パス名からロケールを抽出
 * @param pathname - URLのパス名（例: "/ja/items"）
 * @returns 抽出されたロケール、または見つからない場合はnull
 */
export function extractBoothPathLocale(
	pathname: string,
): BoothPathLocale | null {
	const match = pathname.match(/^\/(ja|ko|en|zh-cn|zh-tw)/i);
	if (!match) return null;
	const locale = match[1].toLowerCase();
	const parsed = boothPathLocaleSchema.safeParse(locale);
	return parsed.success ? parsed.data : null;
}

/**
 * パスが商品詳細ページかどうかを判定
 * @param pathname - 判定するパス（省略時は現在のパス）
 */
export function isBoothItemPath(pathname?: string): boolean {
	const targetPath = pathname ?? getCurrentPath();
	return ITEM_PAGE_REGEX.test(targetPath);
}

/**
 * URL文字列をパースしてURLオブジェクトを生成
 * @param url - パースするURL文字列
 * @param base - ベースURL（省略時は現在のorigin）
 * @returns パース結果、または失敗時はnull
 */
export function parseBoothUrl(url: string, base?: string): URL | null {
	try {
		const resolvedBase = base ?? getCurrentOrigin();
		return new URL(url, resolvedBase);
	} catch {
		return null;
	}
}

/**
 * URLがBooth.pmドメインかどうかを判定
 * @param url - 判定するURLオブジェクト
 */
export function isBoothDomain(url: URL): boolean {
	return url.hostname.toLowerCase().endsWith(BOOTH_HOST_SUFFIX);
}

/**
 * URL文字列が有効なBooth URLかどうかを判定
 *
 * Boothドメインかつ現在のプロトコルと一致するかチェック
 *
 * @param url - 判定するURL文字列
 * @param base - ベースURL（省略時は現在のorigin）
 */
export function isValidBoothUrl(url: string, base?: string): boolean {
	const parsed = parseBoothUrl(url, base);
	if (!parsed) return false;
	const protocol =
		typeof window !== "undefined" ? window.location.protocol : parsed.protocol;
	return isBoothDomain(parsed) && parsed.protocol === protocol;
}

/** 現在のパス名を取得（SSR対応） */
export function getCurrentPath(): string {
	if (typeof window === "undefined") return "/";
	return window.location.pathname;
}

/** 現在のoriginを取得（SSR対応） */
export function getCurrentOrigin(): string {
	if (typeof window === "undefined") return "https://booth.pm";
	return window.location.origin;
}

// i18n 辞書を扱うユーティリティ
import type { Translations } from "@/i18n/locales";
import { en, ja, ko, zh_CN } from "@/i18n/locales";
import { type BoothPathLocale, extractBoothPathLocale } from "@/shared/url";

const locales = { ja, en, ko, zh_CN } as const;

type LocaleKey = keyof typeof locales;

// Booth の URL パスから言語を推測（zh-tw などは zh_CN に集約）
function getLocaleFromURL(): LocaleKey | null {
	const pathLocale = extractBoothPathLocale(window.location.pathname);
	if (!pathLocale) return null;

	const urlToLocale: Record<BoothPathLocale, LocaleKey> = {
		ja: "ja",
		ko: "ko",
		en: "en",
		"zh-cn": "zh_CN",
		"zh-tw": "zh_CN",
	};

	return urlToLocale[pathLocale] ?? null;
}

// URLを優先し、無ければブラウザ設定からロケールを決める
function getBrowserLocale(): LocaleKey {
	const urlLocale = getLocaleFromURL();
	if (urlLocale) return urlLocale;

	const browserLang = navigator.language.split("-")[0];

	// zh 系は簡体字と繁体字をまとめて zh_CN に寄せる
	if (browserLang === "zh") {
		const fullLang = navigator.language.toLowerCase();
		if (fullLang.includes("cn") || fullLang.includes("hans")) {
			return "zh_CN";
		}
	}

	if (browserLang in locales) {
		return browserLang as LocaleKey;
	}
	return "en";
}

// ドット記法キーに対応する翻訳文字列を返す
export function t(key: string): string {
	const locale = getBrowserLocale();
	const translations = locales[locale];

	const keys = key.split(".");
	let value: unknown = translations;

	for (const k of keys) {
		if (isRecord(value) && k in value) {
			value = value[k];
		} else {
			return key;
		}
	}

	return typeof value === "string" ? value : key;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function getLocale(): string {
	return getBrowserLocale();
}

export function getTranslations(): Translations {
	const locale = getBrowserLocale();
	return locales[locale];
}

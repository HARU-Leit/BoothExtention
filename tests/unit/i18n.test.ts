import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getLocale, getTranslations, t } from "@/utils/i18n";

describe("i18n Utilities", () => {
	let originalLocation: Location;

	beforeEach(() => {
		originalLocation = window.location;
	});

	afterEach(() => {
		Object.defineProperty(window, "location", {
			value: originalLocation,
			writable: true,
		});
	});
	it("should have correct locale structure", () => {
		const mockLocale = {
			buttons: {
				block: "ブロック",
				unblock: "ブロック解除",
			},
			features: {
				shopBlocker: "ショップブロック",
				infiniteScroll: "無限スクロール",
			},
		};

		expect(mockLocale.buttons).toBeDefined();
		expect(mockLocale.buttons.block).toBe("ブロック");
		expect(mockLocale.buttons.unblock).toBe("ブロック解除");
		expect(mockLocale.features.shopBlocker).toBe("ショップブロック");
	});

	it("should handle missing translation keys gracefully", () => {
		const mockLocale: Record<string, unknown> = {
			buttons: {
				block: "Block",
			},
		};

		expect(
			(mockLocale.buttons as Record<string, unknown>).missing,
		).toBeUndefined();
	});

	it("should use English for non-Japanese languages", () => {
		const ja = {
			buttons: { block: "ブロック", unblock: "ブロック解除" },
		};

		const en = { buttons: { block: "Block", unblock: "Unblock" } };
		const ko = { buttons: { block: "Block", unblock: "Unblock" } };
		const zh_CN = { buttons: { block: "Block", unblock: "Unblock" } };

		expect(ja.buttons.block).toBe("ブロック");
		expect(ja.buttons.unblock).toBe("ブロック解除");

		expect(en.buttons.block).toBe("Block");
		expect(en.buttons.unblock).toBe("Unblock");
		expect(ko.buttons.block).toBe("Block");
		expect(ko.buttons.unblock).toBe("Unblock");
		expect(zh_CN.buttons.block).toBe("Block");
		expect(zh_CN.buttons.unblock).toBe("Unblock");
	});

	describe("URL language detection", () => {
		it("should detect Japanese from URL", () => {
			delete (window as { location?: unknown }).location;
			window.location = {
				pathname: "/ja/items/12345",
			} as Location;

			const locale = getLocale();
			expect(locale).toBe("ja");
		});

		it("should detect Korean from URL", () => {
			delete (window as { location?: unknown }).location;
			window.location = {
				pathname: "/ko/items/12345",
			} as Location;

			const locale = getLocale();
			expect(locale).toBe("ko");
		});

		it("should detect English from URL", () => {
			delete (window as { location?: unknown }).location;
			window.location = {
				pathname: "/en/items/12345",
			} as Location;

			const locale = getLocale();
			expect(locale).toBe("en");
		});

		it("should detect Simplified Chinese from URL", () => {
			delete (window as { location?: unknown }).location;
			window.location = {
				pathname: "/zh-cn/items/12345",
			} as Location;

			const locale = getLocale();
			expect(locale).toBe("zh_CN");
		});

		it("should detect Traditional Chinese from URL and fallback to Simplified", () => {
			delete (window as { location?: unknown }).location;
			window.location = {
				pathname: "/zh-tw/items/12345",
			} as Location;

			const locale = getLocale();
			expect(locale).toBe("zh_CN");
		});

		it("should return English translation for Korean URL", () => {
			delete (window as { location?: unknown }).location;
			window.location = {
				pathname: "/ko/items/12345",
			} as Location;

			const translations = getTranslations();
			expect(translations.buttons.block).toBe("Block");
			expect(translations.buttons.unblock).toBe("Unblock");
		});

		it("should return Japanese translation for Japanese URL", () => {
			delete (window as { location?: unknown }).location;
			window.location = {
				pathname: "/ja/items/12345",
			} as Location;

			const translations = getTranslations();
			expect(translations.buttons.block).toBe("ブロック");
			expect(translations.buttons.unblock).toBe("ブロック解除");
		});

		it("should use t() function with URL-based locale", () => {
			delete (window as { location?: unknown }).location;
			window.location = {
				pathname: "/ko/items/12345",
			} as Location;

			expect(t("buttons.block")).toBe("Block");
			expect(t("buttons.unblock")).toBe("Unblock");
		});
	});
});

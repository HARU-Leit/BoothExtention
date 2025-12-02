import type { Feature } from "@/app/feature";
import { BaseFeature } from "@/app/feature";
import type {
	LanguageSearchProfile,
	MultiSearchProfileSettings,
} from "@/shared/search";
import {
	buildAbsoluteSearchUrl,
	getActiveProfile,
	isShopListingPath,
	pickLocaleForPath,
	urlMatchesProfile,
} from "@/shared/search";
import type { BoothPathLocale } from "@/shared/url";

/**
 * 検索プロファイル機能
 *
 * 保存された検索条件を自動的に適用し、
 * ユーザーが設定したフィルターで検索結果を表示する
 */
export class SearchProfileFeature extends BaseFeature {
	public readonly id = "search-profile";

	private static readonly SESSION_TARGET_KEY =
		"boothOptimizer:pendingSearchProfileTarget";
	private static readonly SESSION_APPLIED_KEY =
		"boothOptimizer:searchProfileApplied";
	private pendingTargetUrl: string | null = null;

	protected async onInit(): Promise<void> {
		this.restorePendingRedirect();
		const binder = this.getStorageBinder();
		await binder.bind(
			this.storage.multiSearchProfiles,
			async (settings) => {
				await this.handleProfilesUpdate(settings);
			},
			{ logKey: "multiSearchProfiles" },
		);
	}

	private async handleProfilesUpdate(
		settings: MultiSearchProfileSettings,
	): Promise<void> {
		if (typeof window === "undefined") {
			return;
		}

		const pathname = window.location.pathname;

		if (!settings.enabled) {
			this.clearPendingRedirect();
			return;
		}

		if (!isShopListingPath(pathname)) {
			this.clearPendingRedirect();
			return;
		}

		// セッション内で既に適用済みなら何もしない（ユーザーの検索変更を尊重）
		if (this.hasAppliedInSession()) {
			this.logger.debug("Search profile already applied in this session");
			return;
		}

		const effectiveLocale = pickLocaleForPath(pathname);
		const profile = getActiveProfile(settings);
		if (!profile) {
			return;
		}

		const currentUrl = new URL(window.location.href);
		if (urlMatchesProfile(currentUrl, effectiveLocale, profile)) {
			// 既にプロファイルと一致している場合も適用済みとしてマーク
			this.markAppliedInSession();
			this.clearPendingRedirect();
			return;
		}

		this.applyProfile(effectiveLocale, profile);
	}

	private applyProfile(
		locale: BoothPathLocale,
		profile: LanguageSearchProfile,
	): void {
		const targetUrl = buildAbsoluteSearchUrl(locale, profile, { page: 1 });
		if (this.pendingTargetUrl === targetUrl) {
			return;
		}

		this.markPendingRedirect(targetUrl);
		this.markAppliedInSession();
		this.logger.info("Applying saved search profile", { locale });
		window.location.replace(targetUrl);
	}

	private restorePendingRedirect(): void {
		if (typeof window === "undefined") {
			this.pendingTargetUrl = null;
			return;
		}

		try {
			this.pendingTargetUrl = window.sessionStorage.getItem(
				SearchProfileFeature.SESSION_TARGET_KEY,
			);
		} catch (error) {
			this.logger.debug("Failed to restore pending search redirect", {
				error,
			});
			this.pendingTargetUrl = null;
		}
	}

	private markPendingRedirect(targetUrl: string): void {
		this.pendingTargetUrl = targetUrl;
		this.persistPendingRedirect(targetUrl);
	}

	private clearPendingRedirect(): void {
		this.pendingTargetUrl = null;
		this.persistPendingRedirect(null);
	}

	private persistPendingRedirect(value: string | null): void {
		if (typeof window === "undefined") {
			return;
		}
		try {
			if (value) {
				window.sessionStorage.setItem(
					SearchProfileFeature.SESSION_TARGET_KEY,
					value,
				);
			} else {
				window.sessionStorage.removeItem(
					SearchProfileFeature.SESSION_TARGET_KEY,
				);
			}
		} catch (error) {
			this.logger.debug("Failed to persist pending search redirect", {
				error,
			});
		}
	}

	private hasAppliedInSession(): boolean {
		if (typeof window === "undefined") {
			return false;
		}
		try {
			return (
				window.sessionStorage.getItem(
					SearchProfileFeature.SESSION_APPLIED_KEY,
				) === "true"
			);
		} catch (_) {
			return false;
		}
	}

	private markAppliedInSession(): void {
		if (typeof window === "undefined") {
			return;
		}
		try {
			window.sessionStorage.setItem(
				SearchProfileFeature.SESSION_APPLIED_KEY,
				"true",
			);
		} catch (error) {
			this.logger.debug("Failed to mark search profile as applied", { error });
		}
	}
}

/**
 * SearchProfileFeatureのファクトリ関数
 * @returns SearchProfileFeatureインスタンス
 */
export function createSearchProfileFeature(): Feature {
	return new SearchProfileFeature();
}

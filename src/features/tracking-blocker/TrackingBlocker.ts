import type { z } from "zod/mini";
import {
	RULE_ID_RANGES,
	TRACKING,
	TRACKING_BLOCKLIST,
} from "@/config/constants";
import { logger } from "@/shared/core";
import { trackingBlockerConfigSchema } from "@/shared/schema";
import type { TrackingBlockerConfig } from "@/types";

/** ブロック対象のリソースタイプ */
const BLOCKED_RESOURCE_TYPES = [
	"script",
	"xmlhttprequest",
	"sub_frame",
	"image",
	"ping",
	"stylesheet",
	"font",
	"media",
	"websocket",
	"other",
] as const;

/** トラッキングブロックを適用するドメイン */
const TRACKING_INITIATOR_DOMAINS = ["booth.pm", "*.booth.pm"] as const;

type TrackingBlockerSettings = z.infer<typeof trackingBlockerConfigSchema>;

/** 正規表現の特殊文字 */
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

/**
 * トラッキングブロッカー
 *
 * declarativeNetRequest APIを使用して
 * Google Analytics等のトラッキングリクエストを遮断する
 */
export class TrackingBlocker {
	private readonly config: TrackingBlockerSettings;
	private isInitialized = false;

	/**
	 * @param config - トラッキングブロッカー設定
	 */
	public constructor(config?: Partial<TrackingBlockerConfig>) {
		this.config = trackingBlockerConfigSchema.parse({
			enabled: config?.enabled ?? true,
			blockList: config?.blockList ?? TRACKING_BLOCKLIST,
		});
	}

	/** トラッキングブロッカーを初期化し、ルールを有効化 */
	public async init(): Promise<void> {
		if (this.isInitialized) {
			logger.warn("TrackingBlocker already initialized");
			return;
		}

		try {
			if (this.config.enabled) {
				await this.enableBlocking();
				logger.info("TrackingBlocker enabled", {
					blockListCount: this.config.blockList.length,
				});
			}

			this.isInitialized = true;
		} catch (error) {
			logger.error("Failed to initialize TrackingBlocker", error);
		}
	}

	private async getExistingTrackingRuleIds(): Promise<number[]> {
		const existingRules = await browser.declarativeNetRequest.getDynamicRules();
		return existingRules
			.filter(
				(rule) =>
					rule.id >= RULE_ID_RANGES.TRACKING_BLOCKER.START &&
					rule.id <= RULE_ID_RANGES.TRACKING_BLOCKER.END,
			)
			.map((rule) => rule.id);
	}

	/**
	 * URLパターン（ワイルドカード形式）を正規表現に変換
	 *
	 * 変換手順:
	 * 1. 正規表現の特殊文字をエスケープ（例: "." → "\."）
	 * 2. エスケープされた "\*" を ".*" に置換（ワイルドカード展開）
	 * 3. 先頭と末尾にアンカーを追加（完全一致）
	 *
	 * 例: "*://www.google-analytics.com/*"
	 *   → "^.*://www\.google-analytics\.com/.*$"
	 */
	private patternToRegex(urlPattern: string): string {
		const trimmed = urlPattern.trim();
		// 正規表現特殊文字をエスケープ（* も一旦エスケープされる）
		const escaped = trimmed.replace(
			REGEX_SPECIAL_CHARS,
			(match) => `\\${match}`,
		);
		// エスケープされた \* を .* に置換してワイルドカードとして機能させる
		const withWildcards = escaped.replace(/\\\*/g, ".*");
		return `^${withWildcards}$`;
	}

	private async enableBlocking(): Promise<void> {
		const blockList = this.config.blockList;
		const rules = blockList.map((urlPattern: string, index: number) => ({
			id: RULE_ID_RANGES.TRACKING_BLOCKER.START + index,
			priority: TRACKING.RULE_PRIORITY,
			action: {
				type: "block" as const,
			},
			condition: {
				regexFilter: this.patternToRegex(urlPattern),
				resourceTypes: [
					...BLOCKED_RESOURCE_TYPES,
				] as browser.declarativeNetRequest.ResourceType[],
				initiatorDomains: [...TRACKING_INITIATOR_DOMAINS],
			},
		}));

		try {
			const trackingRuleIds = await this.getExistingTrackingRuleIds();

			if (trackingRuleIds.length > 0) {
				await browser.declarativeNetRequest.updateDynamicRules({
					removeRuleIds: trackingRuleIds,
				});
				logger.debug("Existing tracking rules removed", {
					count: trackingRuleIds.length,
				});
			}

			await browser.declarativeNetRequest.updateDynamicRules({
				addRules: rules,
			});

			logger.info("Tracking blocker rules added", {
				count: rules.length,
			});
		} catch (error) {
			logger.error("Failed to add tracking blocker rules", error);
			throw error;
		}
	}

	/** トラッキングブロッカーを無効化し、ルールを削除 */
	public async disable(): Promise<void> {
		try {
			const trackingRuleIds = await this.getExistingTrackingRuleIds();

			if (trackingRuleIds.length > 0) {
				await browser.declarativeNetRequest.updateDynamicRules({
					removeRuleIds: trackingRuleIds,
				});
				logger.info("Tracking blocker disabled", {
					rulesRemoved: trackingRuleIds.length,
				});
			}
		} catch (error) {
			logger.error("Failed to disable tracking blocker", error);
		}

		this.isInitialized = false;
	}
}

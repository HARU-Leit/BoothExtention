<!--
  PriceTrackerSection.svelte - 価格トラッカーセクション

  ウィッシュリストの価格追跡と値下げ通知を管理
  統計情報のみ表示（商品リストはウィッシュリストページで管理）
-->
<script lang="ts">
import type { PriceTrackerSettings, TrackedItem } from "@/types";
import { t } from "@/utils/i18n";

interface Props {
	settings: PriceTrackerSettings;
	onToggleEnabled: (enabled: boolean) => void;
	onCheckNow: () => void;
	isChecking: boolean;
}

const { settings, onToggleEnabled, onCheckNow, isChecking }: Props = $props();

/** 最新価格を取得 */
function getLatestPrice(item: TrackedItem): number | null {
	if (item.priceHistory.length === 0) return null;
	return item.priceHistory[item.priceHistory.length - 1].price;
}

/** 前回の価格を取得 */
function getPreviousPrice(item: TrackedItem): number | null {
	if (item.priceHistory.length < 2) return null;
	return item.priceHistory[item.priceHistory.length - 2].price;
}

/** 値下げ中かどうか */
function isPriceDropped(item: TrackedItem): boolean {
	const latest = getLatestPrice(item);
	const previous = getPreviousPrice(item);
	if (latest === null || previous === null) return false;
	return latest < previous;
}

/** 最終チェック日時をフォーマット */
function formatLastChecked(isoString: string | null): string {
	if (!isoString) return t("priceTracker.neverChecked");
	const date = new Date(isoString);
	return date.toLocaleString();
}

/** 値下げ中のアイテム数を取得 */
const priceDropCount = $derived(settings.items.filter(isPriceDropped).length);
</script>

<section class="section">
	<div class="section-header">
		<h2 class="section-title">
			{t("priceTracker.title")}
		</h2>
		<label class="toggle">
			<input
				type="checkbox"
				checked={settings.enabled}
				onchange={(e) => onToggleEnabled((e.currentTarget as HTMLInputElement).checked)}
			/>
			<span class="toggle-slider"></span>
		</label>
	</div>

	{#if settings.enabled}
		<div class="stats-container">
			<div class="stat-row">
				<span class="stat-label">{t("priceTracker.trackedCount")}:</span>
				<span class="stat-value">{settings.items.length}</span>
			</div>
			<div class="stat-row">
				<span class="stat-label">{t("priceTracker.priceDrops")}:</span>
				<span class="stat-value" class:highlight={priceDropCount > 0}>
					{priceDropCount}
				</span>
			</div>
			<div class="stat-row">
				<span class="stat-label">{t("priceTracker.lastChecked")}:</span>
				<span class="stat-value datetime">{formatLastChecked(settings.lastCheckedAt)}</span>
			</div>
		</div>

		<button
			class="check-now-btn"
			onclick={onCheckNow}
			disabled={isChecking}
		>
			{#if isChecking}
				<span class="spinner"></span>
				{t("priceTracker.checking")}
			{:else}
				{t("priceTracker.checkNow")}
			{/if}
		</button>

		<p class="hint">{t("priceTracker.hint")}</p>
	{/if}
</section>

<style>
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 600;
		margin: 0;
	}

	.toggle {
		position: relative;
		display: inline-block;
		width: 36px;
		height: 20px;
	}

	.toggle input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: var(--toggle-off);
		transition: 0.2s;
		border-radius: 20px;
	}

	.toggle-slider::before {
		position: absolute;
		content: "";
		height: 16px;
		width: 16px;
		left: 2px;
		bottom: 2px;
		background-color: white;
		transition: 0.2s;
		border-radius: 50%;
	}

	.toggle input:checked + .toggle-slider {
		background-color: var(--accent);
	}

	.toggle input:checked + .toggle-slider::before {
		transform: translateX(16px);
	}

	.stats-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		background: var(--bg-elevated);
		border-radius: 8px;
		margin-bottom: 12px;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 13px;
	}

	.stat-label {
		color: var(--text-secondary);
	}

	.stat-value {
		font-weight: 500;
		color: var(--text-primary);
	}

	.stat-value.highlight {
		color: #e53935;
		font-weight: 600;
	}

	.stat-value.datetime {
		font-size: 12px;
	}

	.check-now-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 100%;
		padding: 10px 16px;
		font-size: 13px;
		font-weight: 500;
		background: var(--accent-color);
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.check-now-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.check-now-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.hint {
		font-size: 11px;
		color: var(--text-tertiary);
		text-align: center;
		margin: 12px 0 0;
	}
</style>

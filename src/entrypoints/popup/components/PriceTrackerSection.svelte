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

function getLatestPrice(item: TrackedItem): number | null {
	if (item.priceHistory.length === 0) return null;
	return item.priceHistory[item.priceHistory.length - 1].price;
}

function getPreviousPrice(item: TrackedItem): number | null {
	if (item.priceHistory.length < 2) return null;
	return item.priceHistory[item.priceHistory.length - 2].price;
}

function isPriceDropped(item: TrackedItem): boolean {
	const latest = getLatestPrice(item);
	const previous = getPreviousPrice(item);
	if (latest === null || previous === null) return false;
	return latest < previous;
}

function formatLastChecked(isoString: string | null): string {
	if (!isoString) return t("priceTracker.neverChecked");
	const date = new Date(isoString);
	return date.toLocaleString();
}

const priceDroppedItems = $derived(settings.items.filter(isPriceDropped));
const priceDropCount = $derived(priceDroppedItems.length);

function calculateDiscount(oldPrice: number, newPrice: number): number {
	return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
}

function formatPrice(price: number): string {
	return `¥${price.toLocaleString()}`;
}

function openItemPage(url: string): void {
	window.open(url, "_blank");
}
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

		{#if priceDroppedItems.length > 0}
			<div class="price-drop-list">
				<h3 class="list-title">{t("priceTracker.priceDropList")}</h3>
				{#each priceDroppedItems as item}
					{@const oldPrice = getPreviousPrice(item)}
					{@const newPrice = getLatestPrice(item)}
					{#if oldPrice !== null && newPrice !== null}
						<button
							class="price-drop-item"
							onclick={() => openItemPage(item.url)}
							type="button"
						>
							<span class="item-name" title={item.name}>{item.name}</span>
							<div class="price-info">
								<span class="old-price">{formatPrice(oldPrice)}</span>
								<span class="arrow">→</span>
								<span class="new-price">{formatPrice(newPrice)}</span>
								<span class="discount">-{calculateDiscount(oldPrice, newPrice)}%</span>
							</div>
						</button>
					{/if}
				{/each}
			</div>
		{/if}

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
		margin-bottom: 14px;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: var(--font-display);
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.01em;
		margin: 0;
	}

	.toggle {
		position: relative;
		display: inline-block;
		width: 44px;
		height: 24px;
		cursor: pointer;
	}

	.toggle input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		inset: 0;
		background-color: var(--toggle-track);
		transition: background var(--duration-normal) var(--ease-out);
		border-radius: var(--radius-full);
	}

	.toggle-slider::before {
		position: absolute;
		content: "";
		height: 18px;
		width: 18px;
		left: 3px;
		top: 3px;
		background-color: white;
		border-radius: 50%;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
		transition: transform var(--duration-normal) var(--ease-spring);
	}

	.toggle input:checked + .toggle-slider {
		background-color: var(--accent);
	}

	.toggle input:checked + .toggle-slider::before {
		transform: translateX(20px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
	}

	.toggle input:focus-visible + .toggle-slider {
		box-shadow: var(--shadow-focus);
	}

	.stats-container {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
		background: var(--bg-elevated);
		border-radius: var(--radius-sm);
		margin-bottom: 14px;
		border: 1px solid var(--border-subtle);
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
		font-family: var(--font-display);
		font-weight: 600;
		color: var(--text-primary);
	}

	.stat-value.highlight {
		color: var(--accent);
		position: relative;
		padding: 2px 8px;
		background: var(--accent-soft);
		border-radius: var(--radius-xs);
	}

	.stat-value.datetime {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-muted);
	}

	.check-now-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 12px 18px;
		font-family: var(--font-display);
		font-size: 13px;
		font-weight: 600;
		background: var(--accent);
		color: var(--text-inverse);
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		box-shadow: 0 2px 4px var(--accent-soft);
		transition: all var(--duration-fast) var(--ease-out);
	}

	.check-now-btn:hover:not(:disabled) {
		background: var(--accent-hover);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px var(--accent-glow);
	}

	.check-now-btn:active:not(:disabled) {
		transform: translateY(0);
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
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.hint {
		font-size: 11px;
		color: var(--text-muted);
		text-align: center;
		margin: 14px 0 0;
		line-height: 1.5;
	}

	.price-drop-list {
		margin-bottom: 14px;
	}

	.list-title {
		font-family: var(--font-display);
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		margin: 0 0 8px;
	}

	.price-drop-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 100%;
		padding: 10px 12px;
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		transition: all var(--duration-fast) var(--ease-out);
	}

	.price-drop-item:hover {
		background: var(--bg-hover);
		border-color: var(--accent);
	}

	.price-drop-item + .price-drop-item {
		margin-top: 6px;
	}

	.item-name {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.price-info {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
	}

	.old-price {
		color: var(--text-muted);
		text-decoration: line-through;
	}

	.arrow {
		color: var(--text-muted);
		font-size: 10px;
	}

	.new-price {
		font-family: var(--font-display);
		font-weight: 600;
		color: var(--accent);
	}

	.discount {
		font-family: var(--font-display);
		font-size: 11px;
		font-weight: 600;
		color: #e53935;
		background: rgba(229, 57, 53, 0.1);
		padding: 2px 6px;
		border-radius: var(--radius-xs);
	}
</style>

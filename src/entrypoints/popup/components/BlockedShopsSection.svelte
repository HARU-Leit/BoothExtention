<!--
  BlockedShopsSection.svelte - ブロック済みショップ一覧

  ブロックしたショップの表示と解除を管理
-->
<script lang="ts">
import type { BlockedShop } from "@/app/storage";
import { formatBlockedDate } from "@/features/shop-blocker/shopBlockControls";
import { t } from "@/utils/i18n";

interface Props {
	blocked: BlockedShop[];
	onUnblock: (name: string) => void;
}

const { blocked, onUnblock }: Props = $props();

const hasBlocked = $derived(blocked.length > 0);
</script>

<section class="section">
	<h2 class="section-title">
		{t("blockedShops.title")}
		<span class="count-badge">{blocked.length}</span>
	</h2>
	{#if hasBlocked}
		<div class="blocked-list">
			{#each blocked as { name, blockedAt }}
				<div class="blocked-item">
					<div class="shop-info">
						<span class="shop-name">{name}</span>
						<span class="blocked-date">{formatBlockedDate(blockedAt)}</span>
					</div>
					<button class="unblock-btn" onclick={() => onUnblock(name)}>
						{t("buttons.unblockShort")}
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<div class="empty-icon">
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
			</div>
			<p class="empty-message">{t("blockedShops.empty")}</p>
			<p class="empty-hint">{t("blockedShops.hint")}</p>
		</div>
	{/if}
</section>

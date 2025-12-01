<!--
  SettingsSection.svelte - 基本設定セクション

  以下の設定を管理:
  - 自動リダイレクト
  - 無限スクロール
  - Boothダークモード
-->
<script lang="ts">
import { t } from "@/utils/i18n";

interface Props {
	autoRedirect: boolean;
	infiniteScroll: boolean;
	boothDarkModeEnabled: boolean;
	onAutoRedirectChange: (value: boolean) => void;
	onInfiniteScrollChange: (value: boolean) => void;
	onBoothDarkModeChange: (value: boolean) => void;
}

const {
	autoRedirect,
	infiniteScroll,
	boothDarkModeEnabled,
	onAutoRedirectChange,
	onInfiniteScrollChange,
	onBoothDarkModeChange,
}: Props = $props();

function handleAutoRedirectChange(event: Event) {
	const target = event.target as HTMLInputElement;
	onAutoRedirectChange(target.checked);
}

function handleInfiniteScrollChange(event: Event) {
	const target = event.target as HTMLInputElement;
	onInfiniteScrollChange(target.checked);
}

function handleBoothDarkModeChange(event: Event) {
	const target = event.target as HTMLInputElement;
	onBoothDarkModeChange(target.checked);
}
</script>

<section class="section">
	<h2 class="section-title">{t("settings.title")}</h2>
	<div class="setting-grid">
		<div class="setting-item">
			<div class="setting-info">
				<span class="setting-label">{t("settings.autoRedirect")}</span>
			</div>
			<label class="toggle-switch">
				<input
					type="checkbox"
					checked={autoRedirect}
					onchange={handleAutoRedirectChange}
				/>
				<span class="slider"></span>
			</label>
		</div>
		<div class="setting-item">
			<div class="setting-info">
				<span class="setting-label">{t("settings.infiniteScroll")}</span>
			</div>
			<label class="toggle-switch">
				<input
					type="checkbox"
					checked={infiniteScroll}
					onchange={handleInfiniteScrollChange}
				/>
				<span class="slider"></span>
			</label>
		</div>
		<div class="setting-item">
			<div class="setting-info">
				<span class="setting-label">{t("boothDarkMode.title")}</span>
				<span class="setting-hint">{t("boothDarkMode.description")}</span>
			</div>
			<label class="toggle-switch">
				<input
					type="checkbox"
					checked={boothDarkModeEnabled}
					onchange={handleBoothDarkModeChange}
				/>
				<span class="slider"></span>
			</label>
		</div>
	</div>
</section>

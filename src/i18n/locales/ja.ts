import { type Translations, translationsSchema } from "@/shared/schema";

export const ja: Translations = translationsSchema.parse({
	extensionName: "Booth Optimizer",
	extensionDescription: "Boothのブラウジング体験を最適化",

	// ボタン
	buttons: {
		block: "ブロック",
		unblock: "ブロック解除",
		add: "追加",
		remove: "削除",
		unblockShort: "解除",
		save: "保存",
		reset: "リセット",
	},

	// 状態
	status: {
		loading: "読み込み中...",
	},

	// ポップアップ
	popup: {
		title: "Booth Optimizer",
	},

	// ブロック済みショップ
	blockedShops: {
		title: "ブロック中のショップ",
		empty: "ブロック中のショップはありません",
		hint: "ショップページから追加できます",
	},

	// 設定
	settings: {
		title: "設定",
		infiniteScroll: "無限スクロール",
		autoRedirect: "ホーム→検索ページリダイレクト",
		theme: "テーマ",
		themeOptions: {
			light: "ライト",
			dark: "ダーク",
			system: "システム",
		},
	},

	// セクション非表示
	sections: {
		title: "セクション非表示",
		categoryResults: "カテゴリごとの検索結果",
		recentViewed: "最近見た商品",
	},
	// 検索プロファイル管理
	searchProfile: {
		title: "検索プロファイル",
		addProfile: "プロファイルを追加",
		deleteProfile: "プロファイルを削除",
		profileName: "プロファイル名",
		profileNamePlaceholder: "例: VRChat向け",
		maxProfilesReached: "プロファイル数が上限に達しています",
		cannotDeleteLast: "最後のプロファイルは削除できません",
	},
	// Boothダークモード
	boothDarkMode: {
		title: "Boothダークモード",
		description: "Booth.pm本体にダークテーマを適用します",
		enable: "Boothにダークモードを適用",
	},
	// 価格トラッカー
	priceTracker: {
		title: "価格追跡",
		trackedCount: "追跡中",
		priceDrops: "値下げ",
		hint: "ウィッシュリストページで価格を更新します",
		lastChecked: "最終チェック",
		neverChecked: "未チェック",
		checkNow: "今すぐチェック",
		priceDropped: "値下げ！",
		checking: "チェック中...",
	},
	searchProfiles: {
		title: "検索プロファイル",
		description: "検索条件を保存してBoothの一覧で自動適用します。",
		enabledToggle: "検索プロファイルの有効化",
		keyword: "キーワード",
		tags: "タグ",
		tagsHint: "1行につき1タグ（tags[]）",
		except: "除外ワード",
		exceptHint: "1行につき1語（except_words[]）",
		inStockOnly: "在庫ありのみ表示",
		recentOnly: "最近公開のみ",
		sort: "ソート",
		sortForcedByRecent:
			"「最近公開のみ」をオンにするとBOOTH側で自動的に『新着順』になります。",
		sortOptions: {
			popularity: "人気順",
			new: "新着順",
			wish_lists: "スキ順",
			price_desc: "価格高い順",
			price_asc: "価格安い順",
		},
		adult: "成人向け設定",
		adultOptions: {
			absent: "全年齢のみ",
			include: "全年齢 + R18",
			only: "R18のみ",
		},
		minPrice: "最低価格",
		maxPrice: "最高価格",
		priceHint: "制限なし",
	},
});

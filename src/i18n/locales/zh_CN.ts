import { type Translations, translationsSchema } from "@/shared/schema";

export const zh_CN: Translations = translationsSchema.parse({
	extensionName: "Booth Optimizer",
	extensionDescription: "优化您的Booth浏览体验",

	buttons: {
		block: "Block",
		unblock: "Unblock",
		add: "添加",
		remove: "删除",
		unblockShort: "取消",
		save: "保存",
		reset: "重置",
	},

	status: {
		loading: "加载中...",
	},

	popup: {
		title: "Booth Optimizer",
	},

	blockedShops: {
		title: "已屏蔽的店铺",
		empty: "没有已屏蔽的店铺",
		hint: "可从店铺页面添加",
	},

	settings: {
		title: "设置",
		infiniteScroll: "无限滚动",
		autoRedirect: "主页→搜索页重定向",
		theme: "主题",
		themeOptions: {
			light: "浅色",
			dark: "深色",
			system: "系统",
		},
	},

	sections: {
		title: "隐藏部分",
		categoryResults: "分类搜索结果",
		recentViewed: "最近浏览",
	},
	searchProfile: {
		title: "搜索配置",
		addProfile: "添加配置",
		deleteProfile: "删除配置",
		profileName: "配置名称",
		profileNamePlaceholder: "例如：VRChat用",
		maxProfilesReached: "配置数已达上限",
		cannotDeleteLast: "无法删除最后一个配置",
	},
	boothDarkMode: {
		title: "Booth深色模式",
		description: "为Booth.pm网站应用深色主题",
		enable: "为Booth启用深色模式",
	},
	searchProfiles: {
		title: "搜索配置",
		description: "保存一次常用筛选条件，并在店铺列表自动应用。",
		enabledToggle: "启用保存的条件",
		keyword: "关键词",
		tags: "标签",
		tagsHint: "每行一个（tags[]）",
		except: "排除词",
		exceptHint: "每行一个（except_words[]）",
		inStockOnly: "仅显示有库存",
		recentOnly: "仅最近公开",
		sort: "排序",
		sortForcedByRecent: "开启“仅最近公开”时，BOOTH 会自动改成“最新发布”。",
		sortOptions: {
			popularity: "人气",
			new: "最新",
			wish_lists: "想要顺",
			price_desc: "价格从高到低",
			price_asc: "价格从低到高",
		},
		adult: "成人分级",
		adultOptions: {
			absent: "全年龄",
			include: "全年龄 + R18",
			only: "仅 R18",
		},
		minPrice: "最低价格",
		maxPrice: "最高价格",
		priceHint: "无限制",
	},
});

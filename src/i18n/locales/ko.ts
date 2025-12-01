import { type Translations, translationsSchema } from "@/shared/schema";

export const ko: Translations = translationsSchema.parse({
	extensionName: "Booth Optimizer",
	extensionDescription: "Booth 브라우징 경험 최적화",

	buttons: {
		block: "Block",
		unblock: "Unblock",
		add: "추가",
		remove: "삭제",
		unblockShort: "해제",
		save: "저장",
		reset: "초기화",
	},

	status: {
		loading: "로딩 중...",
	},

	popup: {
		title: "Booth Optimizer",
	},

	blockedShops: {
		title: "차단된 상점",
		empty: "차단된 상점이 없습니다",
		hint: "상점 페이지에서 추가할 수 있습니다",
	},

	settings: {
		title: "설정",
		infiniteScroll: "무한 스크롤",
		autoRedirect: "홈 → 검색 페이지 리디렉션",
		theme: "테마",
		themeOptions: {
			light: "라이트",
			dark: "다크",
			system: "시스템",
		},
	},

	sections: {
		title: "섹션 숨기기",
		categoryResults: "카테고리별 검색 결과",
		recentViewed: "최근 본 상품",
	},
	searchProfile: {
		title: "검색 프로필",
		addProfile: "프로필 추가",
		deleteProfile: "프로필 삭제",
		profileName: "프로필 이름",
		profileNamePlaceholder: "예: VRChat용",
		maxProfilesReached: "프로필 수가 최대에 도달했습니다",
		cannotDeleteLast: "마지막 프로필은 삭제할 수 없습니다",
	},
	boothDarkMode: {
		title: "Booth 다크 모드",
		description: "Booth.pm 사이트에 다크 테마를 적용합니다",
		enable: "Booth에 다크 모드 적용",
	},
	priceTracker: {
		title: "가격 추적",
		trackedCount: "추적 중",
		priceDrops: "가격 인하",
		hint: "위시리스트 페이지에서 가격을 업데이트합니다",
		lastChecked: "마지막 확인",
		neverChecked: "확인 안 됨",
		checkNow: "지금 확인",
		priceDropped: "가격 인하!",
		checking: "확인 중...",
	},
	searchProfiles: {
		title: "검색 프로필",
		description:
			"선호 필터를 한 번만 저장하면 모든 Booth 목록에 자동으로 적용됩니다.",
		enabledToggle: "저장한 필터 사용",
		keyword: "키워드",
		tags: "태그",
		tagsHint: "줄마다 하나씩 입력 (tags[])",
		except: "제외 단어",
		exceptHint: "줄마다 하나씩 입력 (except_words[])",
		inStockOnly: "재고 있는 상품만",
		recentOnly: "최근 공개만",
		sort: "정렬",
		sortForcedByRecent:
			"'최근 공개만'을 켜면 BOOTH가 자동으로 '신상품순'으로 변경합니다.",
		sortOptions: {
			popularity: "인기순",
			new: "신상품순",
			wish_lists: "스키순",
			price_desc: "가격 높은순",
			price_asc: "가격 낮은순",
		},
		adult: "성인 필터",
		adultOptions: {
			absent: "전체 이용가",
			include: "전체 + R18",
			only: "R18 전용",
		},
		minPrice: "최저 가격",
		maxPrice: "최고 가격",
		priceHint: "제한 없음",
	},
});

// SearchProfile 専用のストレージアイテム（マイグレーション対応）
import {
	createDefaultLanguageProfile,
	generateProfileId,
	type LanguageSearchProfile,
	type MultiSearchProfileSettings,
	type NamedSearchProfile,
	normalizeMultiProfileSettings,
	normalizeSearchProfileSettings,
	type SearchProfileSettings,
} from "@/shared/search";
import { StorageItem } from "./item";

/**
 * SearchProfile用の特殊化されたStorageItem
 *
 * 以下のマイグレーションを自動で行う:
 * - 旧形式 { profiles: { ja: {...}, en: {...} } } → 新形式 { enabled, profile }
 * - enabled フィールドが無い場合はデフォルトで有効化
 */
export class SearchProfileStorageItem extends StorageItem<SearchProfileSettings> {
	public override async getValue(): Promise<SearchProfileSettings> {
		const value = await super.getValue();
		return normalizeSearchProfileSettings(value);
	}

	public override async setValue(value: SearchProfileSettings): Promise<void> {
		await super.setValue(normalizeSearchProfileSettings(value));
	}

	protected override parse(value: unknown): SearchProfileSettings {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			const record = value as Record<string, unknown>;

			// 旧形式からのマイグレーション
			const migrated = this.migrateLegacyProfiles(record);
			if (migrated) {
				return migrated;
			}

			// enabled フィールドが無い場合の補完
			if (!("enabled" in record) && "profile" in record) {
				return normalizeSearchProfileSettings(
					super.parse({ ...record, enabled: true }),
				);
			}
		}
		return normalizeSearchProfileSettings(super.parse(value));
	}

	/**
	 * 旧形式 { profiles: { locale: profile } } を新形式に変換
	 * 複数言語プロファイルがあった場合は最初のものを採用
	 */
	private migrateLegacyProfiles(
		record: Record<string, unknown>,
	): SearchProfileSettings | null {
		const legacyProfiles = record.profiles;
		if (!legacyProfiles || typeof legacyProfiles !== "object") {
			return null;
		}

		const candidates = Object.values(
			legacyProfiles as Record<string, LanguageSearchProfile>,
		).filter(
			(profile): profile is LanguageSearchProfile =>
				profile != null && typeof profile === "object",
		);

		const profile = candidates[0] ?? createDefaultLanguageProfile();
		const enabled =
			typeof record.enabled === "boolean" ? (record.enabled as boolean) : true;

		return normalizeSearchProfileSettings({
			enabled,
			profile,
		});
	}
}

/**
 * MultiSearchProfile用の特殊化されたStorageItem
 *
 * 以下のマイグレーションを自動で行う:
 * - 旧形式 { enabled, profile } → 新形式 { enabled, activeProfileId, profiles }
 * - 旧形式 { profiles: { ja: {...} } } → 新形式
 */
export class MultiSearchProfileStorageItem extends StorageItem<MultiSearchProfileSettings> {
	public override async getValue(): Promise<MultiSearchProfileSettings> {
		const value = await super.getValue();
		return normalizeMultiProfileSettings(value);
	}

	public override async setValue(
		value: MultiSearchProfileSettings,
	): Promise<void> {
		await super.setValue(normalizeMultiProfileSettings(value));
	}

	protected override parse(value: unknown): MultiSearchProfileSettings {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			const record = value as Record<string, unknown>;

			// 既に新形式の場合
			if ("profiles" in record && Array.isArray(record.profiles)) {
				return normalizeMultiProfileSettings(
					super.parse(value) as MultiSearchProfileSettings,
				);
			}

			// 旧形式からのマイグレーション
			const migrated = this.migrateFromOldFormat(record);
			if (migrated) {
				return migrated;
			}
		}
		return normalizeMultiProfileSettings(
			super.parse(value) as MultiSearchProfileSettings,
		);
	}

	/**
	 * 旧形式からのマイグレーション
	 * - { enabled, profile } → 新形式
	 * - { profiles: { ja: {...} } } → 新形式
	 */
	private migrateFromOldFormat(
		record: Record<string, unknown>,
	): MultiSearchProfileSettings | null {
		const enabled = typeof record.enabled === "boolean" ? record.enabled : true;

		// { enabled, profile } 形式からのマイグレーション
		if (
			"profile" in record &&
			record.profile &&
			typeof record.profile === "object"
		) {
			const legacyProfile = record.profile as LanguageSearchProfile;
			const namedProfile: NamedSearchProfile = {
				...legacyProfile,
				id: generateProfileId(),
				name: "Default",
				// 価格フィールドがない場合の補完
				minPrice: legacyProfile.minPrice ?? null,
				maxPrice: legacyProfile.maxPrice ?? null,
			};

			return normalizeMultiProfileSettings({
				enabled,
				activeProfileId: namedProfile.id,
				profiles: [namedProfile],
			});
		}

		// { profiles: { locale: {...} } } 形式からのマイグレーション
		const legacyProfiles = record.profiles;
		if (
			legacyProfiles &&
			typeof legacyProfiles === "object" &&
			!Array.isArray(legacyProfiles)
		) {
			const candidates = Object.values(
				legacyProfiles as Record<string, LanguageSearchProfile>,
			).filter(
				(profile): profile is LanguageSearchProfile =>
					profile != null && typeof profile === "object",
			);

			if (candidates.length > 0) {
				const firstProfile = candidates[0];
				const namedProfile: NamedSearchProfile = {
					...firstProfile,
					id: generateProfileId(),
					name: "Default",
					minPrice: firstProfile.minPrice ?? null,
					maxPrice: firstProfile.maxPrice ?? null,
				};

				return normalizeMultiProfileSettings({
					enabled,
					activeProfileId: namedProfile.id,
					profiles: [namedProfile],
				});
			}
		}

		return null;
	}
}

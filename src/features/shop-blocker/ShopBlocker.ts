import type { GridItemStage } from "@/app/grid-pipeline";
import { CLASS_NAMES, SELECTORS } from "@/config/constants";
import { logger } from "@/shared/core";
import { blockedShopListSchema } from "@/shared/schema";
import type { BlockedShop } from "@/types";
import { domBatcher } from "@/utils/domBatcher";
import { shopNameSchema } from "./schemas";
import { createShopBlockButton } from "./shopBlockControls";

/**
 * ショップ名を抽出するためのセレクター候補
 *
 * 頻度順に並べることで、最初のマッチでループを抜けられる確率を上げる
 * - グリッドアイテムで最も使われる ITEM_CARD_SHOP_NAME を先頭に配置
 * - ショップページ固有のセレクターは後方に配置
 */
const SHOP_NAME_SELECTORS = [
	SELECTORS.ITEM_CARD_SHOP_NAME, // グリッドで最頻出
	SELECTORS.SHOP_NAME,
	".shop-name-label", // ショップページのショップ名
	".shop-head__shop-name", // ショップヘッダー
	".shop-info .shop-name",
	'[class*="shop-name"]', // フォールバック（低速）
	".user-info .name",
	".shop-header .name",
] as const;

/**
 * ショップブロッカー
 *
 * ブロックリストに登録されたショップの商品カードを
 * グリッドから除外し、ショップページにブロックボタンを追加する
 */
export class ShopBlocker {
	/** pruneIndex をスキップするインデックスサイズの閾値 */
	private static readonly PRUNE_THRESHOLD = 50;

	private blockedShops: readonly BlockedShop[] = [];
	private blockedNameSet = new Set<string>();
	private readonly cardIndex = new Map<string, Set<WeakRef<Element>>>();
	private readonly elementShopNameCache = new WeakMap<Element, string | null>();
	private cachedShopName: string | null = null;
	private isCacheInitialized = false;
	private cardAdditionsSinceLastPrune = 0;

	/**
	 * ブロック対象ショップリストを更新
	 *
	 * リスト更新時に既存のインデックス済みカードも再評価する
	 *
	 * @param shops - ブロック対象のショップ配列
	 */
	public updateBlockedShops(shops: readonly BlockedShop[]): void {
		if (import.meta.env.DEV) {
			blockedShopListSchema.parse(shops);
		}
		this.blockedShops = shops;
		this.blockedNameSet = new Set(this.blockedShops.map((shop) => shop.name));
		this.pruneIndex();
		this.removeIndexedBlockedCards();
	}

	/**
	 * ブロック対象のアイテムをフィルタリング
	 *
	 * @param items - フィルタリング対象の要素配列
	 * @param stage - パイプラインのステージ
	 * @returns ブロックされていないアイテムの配列
	 */
	public filterBlockedItems(items: Element[], stage: GridItemStage): Element[] {
		if (this.blockedNameSet.size === 0 || items.length === 0) {
			return items;
		}

		const filtered = items.filter((item) => {
			const shopName = this.getShopName(item);
			return shopName ? !this.blockedNameSet.has(shopName) : true;
		});

		const removed = items.length - filtered.length;
		if (removed > 0) {
			logger.info("Shop blocking filtered cards", { stage, removed });
		}

		return filtered;
	}

	/**
	 * 追加されたアイテムをインデックスに登録
	 *
	 * 後からブロックリストが更新された際に即座に除去できるよう、
	 * ショップ名とカード要素の対応を記録する
	 *
	 * @param items - 追加されたアイテム要素
	 */
	public handleItemsAppended(items: readonly Element[]): void {
		if (items.length === 0) return;
		for (const card of items) {
			const shopName = this.getShopName(card);
			if (!shopName) continue;
			this.addCardToIndex(shopName, card);
		}
	}

	private removeIndexedBlockedCards(): void {
		if (this.blockedNameSet.size === 0) {
			return;
		}

		const toRemove: Element[] = [];
		for (const name of this.blockedNameSet) {
			const cards = this.cardIndex.get(name);
			if (!cards) continue;
			for (const ref of cards) {
				const card = ref.deref();
				if (!card) {
					cards.delete(ref);
					continue;
				}
				if (card.isConnected) {
					toRemove.push(card);
				}
			}
			if (cards.size === 0) {
				this.cardIndex.delete(name);
			}
		}

		if (toRemove.length === 0) {
			return;
		}

		domBatcher.write(() => {
			for (const card of toRemove) {
				card.remove();
			}
		});

		logger.info("Shop blocking applied to indexed cards", {
			removed: toRemove.length,
			blockedShops: this.blockedNameSet.size,
		});
	}

	/**
	 * インデックスから無効な参照を削除
	 *
	 * パフォーマンス最適化: インデックスサイズが小さい場合や
	 * 追加操作が少ない場合はスキップする
	 */
	private pruneIndex(): void {
		// 小規模なインデックスではスキップ
		if (this.cardIndex.size < ShopBlocker.PRUNE_THRESHOLD) {
			return;
		}

		for (const [name, cards] of this.cardIndex.entries()) {
			this.pruneBucket(cards);
			if (cards.size === 0) {
				this.cardIndex.delete(name);
			}
		}
		this.cardAdditionsSinceLastPrune = 0;
	}

	private pruneBucket(bucket: Set<WeakRef<Element>>): void {
		for (const ref of bucket) {
			const card = ref.deref();
			if (!card || !card.isConnected) {
				bucket.delete(ref);
			}
		}
	}

	private addCardToIndex(shopName: string, card: Element): void {
		let bucket = this.cardIndex.get(shopName);
		if (!bucket) {
			bucket = new Set<WeakRef<Element>>();
			this.cardIndex.set(shopName, bucket);
		} else {
			// バケット単位のクリーンアップは追加が多い場合のみ実行
			this.cardAdditionsSinceLastPrune++;
			if (this.cardAdditionsSinceLastPrune >= ShopBlocker.PRUNE_THRESHOLD) {
				this.pruneBucket(bucket);
			}
		}
		bucket.add(new WeakRef(card));
	}

	private getShopName(element: Element): string | null {
		const cached = this.elementShopNameCache.get(element);
		if (cached !== undefined) {
			return cached;
		}
		const shopName = this.extractShopName(element);
		this.elementShopNameCache.set(element, shopName);
		return shopName;
	}

	private extractShopName(element: Element): string | null {
		for (const selector of SHOP_NAME_SELECTORS) {
			const target = element.matches(selector)
				? element
				: element.querySelector(selector);
			const text = target?.textContent?.trim();
			if (!text) continue;
			const parsed = shopNameSchema.safeParse(text);
			if (parsed.success) {
				return parsed.data;
			}
		}
		return null;
	}

	/**
	 * 現在のショップページの店名を取得
	 *
	 * 初回取得時にキャッシュし、以降はキャッシュを返す
	 *
	 * @returns ショップ名、または取得できない場合はnull
	 */
	public getCurrentShopName(): string | null {
		if (this.isCacheInitialized) {
			return this.cachedShopName;
		}

		for (const selector of SHOP_NAME_SELECTORS) {
			const element = document.querySelector(selector);
			const text = element?.textContent?.trim() ?? "";
			const result = shopNameSchema.safeParse(text);
			if (result.success) {
				this.cachedShopName = result.data;
				this.isCacheInitialized = true;
				return result.data;
			}
		}

		this.cachedShopName = null;
		this.isCacheInitialized = true;
		return null;
	}

	/**
	 * ショップページにブロックボタンを追加
	 *
	 * @param isBlocked - 現在ブロック中かどうか
	 * @param onToggle - ブロック状態切り替え時のコールバック
	 */
	public async addBlockButton(
		isBlocked: boolean,
		onToggle: (newState: boolean) => Promise<void>,
	): Promise<void> {
		// フォローボタンのコンテナを探す
		const followContainer = document.querySelector(
			".shop-global-nav__follow-button",
		);
		if (!followContainer?.parentElement) {
			logger.debug("Follow button container not found");
			return;
		}

		document.querySelector(`.${CLASS_NAMES.BLOCK_BUTTON}`)?.remove();

		const blockButton = createShopBlockButton({
			isBlocked,
			onToggle,
		});

		// フォローボタンと同じ入れ子構造でラップ
		// .shop-global-nav__follow-button > div > div > button
		const wrapper = document.createElement("div");
		wrapper.className = "shop-global-nav__follow-button";
		wrapper.style.marginLeft = "8px";
		const innerDiv1 = document.createElement("div");
		const innerDiv2 = document.createElement("div");
		innerDiv2.appendChild(blockButton);
		innerDiv1.appendChild(innerDiv2);
		wrapper.appendChild(innerDiv1);

		// 親要素をフレックスボックスにして横並びに
		const parent = followContainer.parentElement;
		if (parent && !parent.style.display) {
			parent.style.display = "flex";
			parent.style.alignItems = "center";
		}

		// フォローボタンの隣にブロックボタンを追加
		followContainer.after(wrapper);
	}
}

import { CLASS_NAMES } from "@/config/constants";
import { blockedShopSchema } from "@/shared/schema";
import type { BlockedShop } from "@/types";
import { t } from "@/utils/i18n";

export interface ShopBlockButtonOptions {
	readonly isBlocked: boolean;
	readonly onToggle: (newState: boolean) => Promise<void>;
}

export function createShopBlockButton({
	isBlocked,
	onToggle,
}: ShopBlockButtonOptions): HTMLButtonElement {
	let blockedState = isBlocked;

	const blockButton = document.createElement("button");
	const icon = document.createElement("i");
	const buttonText = document.createElement("span");
	buttonText.className = "align-middle";

	const applyState = (blocked: boolean) => {
		blockedState = blocked;
		if (blocked) {
			blockButton.className = `btn small-dense ${CLASS_NAMES.BLOCK_BUTTON} shop__border--price shop__background--contents shop__text--price`;
			icon.className = "icon-check-circle s-1x";
			buttonText.textContent = t("buttons.unblock");
		} else {
			blockButton.className = `btn small-dense ${CLASS_NAMES.BLOCK_BUTTON} shop__background--price shop__text--contents`;
			icon.className = "icon-attention s-1x";
			buttonText.textContent = t("buttons.block");
		}
	};

	applyState(blockedState);

	blockButton.appendChild(icon);
	blockButton.appendChild(buttonText);

	blockButton.addEventListener("click", async () => {
		const newState = !blockedState;
		await onToggle(newState);
		applyState(newState);
	});

	return blockButton;
}

export function toggleShopInList(
	list: BlockedShop[],
	shopName: string,
	block: boolean,
): BlockedShop[] {
	if (block) {
		if (list.some((shop) => shop.name === shopName)) {
			return list;
		}

		const newEntry = blockedShopSchema.parse({
			id: shopName,
			name: shopName,
			blockedAt: new Date().toISOString(),
		});

		return [...list, newEntry];
	}

	return list.filter((shop) => shop.name !== shopName);
}

export function formatBlockedDate(blockedAt: string, locale?: string): string {
	const resolvedLocale =
		locale ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
	return new Intl.DateTimeFormat(resolvedLocale).format(new Date(blockedAt));
}

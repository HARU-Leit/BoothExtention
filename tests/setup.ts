// Vitest 用セットアップ: グローバル設定とモック
import { afterEach, vi } from "vitest";

// 各テスト後にクリーンアップ
afterEach(() => {
	document.body.innerHTML = "";
	document.head.innerHTML = "";
});

// Chrome 拡張 API を最小限モックする
const mockChromeStorage = {
	local: {
		get: vi.fn(),
		set: vi.fn(),
		// LocalStorageArea の形を満たすためのダミー実装
		remove: vi.fn(),
		clear: vi.fn(),
		getBytesInUse: vi.fn(),
		setAccessLevel: vi.fn(),
		onChanged: {
			addListener: vi.fn(),
			removeListener: vi.fn(),
			hasListener: vi.fn(),
			getRules: vi.fn(),
			removeRules: vi.fn(),
			addRules: vi.fn(),
		},
		QUOTA_BYTES: 5242880, // 5MB
	} as unknown as chrome.storage.LocalStorageArea,
};

const mockChromeRuntime = {
	id: "test-extension-id",
	getManifest: vi.fn(() => ({
		name: "Booth Optimizer",
		version: "0.0.0",
		manifest_version: 3,
	})) as unknown as typeof chrome.runtime.getManifest,
};

// 実際に利用する API のみをモック
globalThis.chrome = {
	storage: mockChromeStorage as unknown as typeof chrome.storage,
	runtime: mockChromeRuntime as unknown as typeof chrome.runtime,
} as typeof chrome;

// requestIdleCallback が無い環境ではモックを注入
if (typeof globalThis.requestIdleCallback === "undefined") {
	globalThis.requestIdleCallback = (callback: IdleRequestCallback) => {
		const start = Date.now();
		return setTimeout(() => {
			callback({
				didTimeout: false,
				timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
			});
		}, 1) as unknown as number;
	};
}

if (typeof globalThis.cancelIdleCallback === "undefined") {
	globalThis.cancelIdleCallback = (id: number) => {
		clearTimeout(id);
	};
}

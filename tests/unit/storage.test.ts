import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Storage Utilities", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should handle blocked shops storage operations", async () => {
		const mockData = [
			{ id: "1", name: "Shop1", blockedAt: "2025-01-01" },
			{ id: "2", name: "Shop2", blockedAt: "2025-01-02" },
		];

		vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

		// @ts-expect-error - chrome.storage の型推論制約を抑制
		vi.mocked(chrome.storage.local.get).mockResolvedValue({
			blockedShops: mockData,
		});

		await chrome.storage.local.set({ blockedShops: mockData });

		const result = await chrome.storage.local.get("blockedShops");

		expect(result.blockedShops).toEqual(mockData);
		expect(chrome.storage.local.set).toHaveBeenCalledWith({
			blockedShops: mockData,
		});
		expect(chrome.storage.local.get).toHaveBeenCalledWith("blockedShops");
	});

	it("should handle empty storage", async () => {
		// @ts-expect-error - chrome.storage の型推論制約を抑制
		vi.mocked(chrome.storage.local.get).mockResolvedValue({});

		const result = await chrome.storage.local.get("blockedShops");

		expect(result.blockedShops).toBeUndefined();
	});

	it("should handle infinite scroll settings", async () => {
		vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

		// @ts-expect-error - chrome.storage の型推論制約を抑制
		vi.mocked(chrome.storage.local.get).mockResolvedValue({
			infiniteScrollEnabled: true,
		});

		await chrome.storage.local.set({ infiniteScrollEnabled: true });

		const result = await chrome.storage.local.get("infiniteScrollEnabled");

		expect(result.infiniteScrollEnabled).toBe(true);
		expect(chrome.storage.local.set).toHaveBeenCalledWith({
			infiniteScrollEnabled: true,
		});
	});

	it("should handle multiple storage keys", async () => {
		const mockStorage = {
			blockedShops: [{ id: "1", name: "Shop1", blockedAt: "2025-01-01" }],
			infiniteScrollEnabled: true,
			hiddenSections: ["recommended"],
		};

		// @ts-expect-error - chrome.storage の型推論制約を抑制
		vi.mocked(chrome.storage.local.get).mockResolvedValue(mockStorage);

		const result = await chrome.storage.local.get([
			"blockedShops",
			"infiniteScrollEnabled",
			"hiddenSections",
		]);

		expect(result).toEqual(mockStorage);
	});

	it("should handle storage.set with multiple keys", async () => {
		const mockData = {
			blockedShops: [{ id: "1", name: "Shop1", blockedAt: "2025-01-01" }],
			infiniteScrollEnabled: true,
		};

		vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

		await chrome.storage.local.set(mockData);

		expect(chrome.storage.local.set).toHaveBeenCalledWith(mockData);
	});
});

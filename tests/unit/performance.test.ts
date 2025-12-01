import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce, delay, runWhenIdle, throttle } from "@/utils/performance";

describe("Performance Utilities", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("delay", () => {
		it("should resolve after specified milliseconds", async () => {
			const promise = delay(1000);

			vi.advanceTimersByTime(999);
			await Promise.resolve();
			expect(promise).toBeInstanceOf(Promise);

			vi.advanceTimersByTime(1);
			await promise;

			expect(true).toBe(true);
		});

		it("should resolve immediately with 0ms", async () => {
			const promise = delay(0);
			vi.advanceTimersByTime(0);
			await promise;

			expect(true).toBe(true);
		});
	});

	describe("debounce", () => {
		it("should execute only the last call after delay", () => {
			const callback = vi.fn();
			const debounced = debounce(callback, 100);

			debounced("first");
			debounced("second");
			debounced("third");

			expect(callback).not.toHaveBeenCalled();

			vi.advanceTimersByTime(99);
			expect(callback).not.toHaveBeenCalled();

			vi.advanceTimersByTime(1);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith("third");
		});

		it("should reset timer on each call", () => {
			const callback = vi.fn();
			const debounced = debounce(callback, 100);

			debounced("first");
			vi.advanceTimersByTime(50);

			debounced("second");
			vi.advanceTimersByTime(50);

			expect(callback).not.toHaveBeenCalled();

			vi.advanceTimersByTime(50);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith("second");
		});

		it("should handle multiple arguments", () => {
			const callback = vi.fn();
			const debounced = debounce(callback, 100);

			debounced("arg1", "arg2", "arg3");
			vi.advanceTimersByTime(100);

			expect(callback).toHaveBeenCalledWith("arg1", "arg2", "arg3");
		});
	});

	describe("throttle", () => {
		it("should execute immediately on first call", () => {
			const callback = vi.fn();
			const throttled = throttle(callback, 100);

			throttled("first");

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith("first");
		});

		it("should throttle rapid calls", () => {
			const callback = vi.fn();
			const throttled = throttle(callback, 100);

			throttled("first");
			throttled("second");
			throttled("third");

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith("first");
		});

		it("should execute trailing call after interval", () => {
			const callback = vi.fn();
			const throttled = throttle(callback, 100);

			throttled("first");
			vi.advanceTimersByTime(50);
			throttled("second");

			expect(callback).toHaveBeenCalledTimes(1);

			vi.advanceTimersByTime(50);
			expect(callback).toHaveBeenCalledTimes(2);
			expect(callback).toHaveBeenCalledWith("second");
		});

		it("should allow calls after interval has passed", () => {
			const callback = vi.fn();
			const throttled = throttle(callback, 100);

			throttled("first");
			expect(callback).toHaveBeenCalledTimes(1);

			vi.advanceTimersByTime(100);
			throttled("second");
			expect(callback).toHaveBeenCalledTimes(2);
		});

		it("should handle multiple arguments", () => {
			const callback = vi.fn();
			const throttled = throttle(callback, 100);

			throttled("arg1", "arg2", "arg3");

			expect(callback).toHaveBeenCalledWith("arg1", "arg2", "arg3");
		});
	});

	describe("runWhenIdle", () => {
		it("should use requestIdleCallback when available", () => {
			const callback = vi.fn();
			const mockRequestIdleCallback = vi.fn();

			globalThis.requestIdleCallback = mockRequestIdleCallback;

			runWhenIdle(callback);

			expect(mockRequestIdleCallback).toHaveBeenCalledWith(callback, undefined);
			expect(callback).not.toHaveBeenCalled();
		});

		it("should fallback to setTimeout when requestIdleCallback unavailable", () => {
			const callback = vi.fn();

			// @ts-expect-error - 一時的に requestIdleCallback を削除
			delete globalThis.requestIdleCallback;

			runWhenIdle(callback);

			expect(callback).not.toHaveBeenCalled();

			vi.advanceTimersByTime(1);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it("should pass options to requestIdleCallback", () => {
			const callback = vi.fn();
			const mockRequestIdleCallback = vi.fn();
			const options = { timeout: 1000 };

			globalThis.requestIdleCallback = mockRequestIdleCallback;

			runWhenIdle(callback, options);

			expect(mockRequestIdleCallback).toHaveBeenCalledWith(callback, options);
		});
	});
});

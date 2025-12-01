import type { ILogger } from "@/types";

enum LogLevel {
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
}

/**
 * 開発用ロガー
 *
 * タイムスタンプ付きでコンソールに出力する。
 * シングルトンパターンで実装。
 */
export class Logger implements ILogger {
	private static instance: Logger;
	private readonly prefix: string;
	private readonly minLevel: LogLevel;

	private constructor(
		prefix: string = "[Booth Optimizer]",
		minLevel: LogLevel = LogLevel.INFO,
	) {
		this.prefix = prefix;
		this.minLevel = minLevel;
	}

	/** シングルトンインスタンスを取得 */
	static getInstance(prefix?: string, minLevel?: LogLevel): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger(prefix, minLevel);
		}
		return Logger.instance;
	}

	private shouldLog(level: LogLevel): boolean {
		const levels = [
			LogLevel.DEBUG,
			LogLevel.INFO,
			LogLevel.WARN,
			LogLevel.ERROR,
		];
		return levels.indexOf(level) >= levels.indexOf(this.minLevel);
	}

	private formatMessage(
		level: LogLevel,
		message: string,
		context?: Record<string, unknown>,
	): string {
		const timestamp = new Date().toISOString();
		const contextStr = context ? ` ${JSON.stringify(context)}` : "";
		return `${this.prefix} [${level.toUpperCase()}] ${timestamp} - ${message}${contextStr}`;
	}

	private log(
		level: LogLevel,
		message: string,
		context?: Record<string, unknown>,
	): void {
		if (!this.shouldLog(level)) return;

		const formatted = this.formatMessage(level, message, context);

		switch (level) {
			case LogLevel.DEBUG:
				console.debug(formatted);
				break;
			case LogLevel.INFO:
				console.log(formatted);
				break;
			case LogLevel.WARN:
				console.warn(formatted);
				break;
			case LogLevel.ERROR:
				console.error(formatted);
				break;
		}
	}

	debug(message: string, context?: unknown): void {
		const ctx =
			context != null && typeof context === "object"
				? (context as Record<string, unknown>)
				: undefined;
		this.log(LogLevel.DEBUG, message, ctx);
	}

	info(message: string, context?: unknown): void {
		const ctx =
			context != null && typeof context === "object"
				? (context as Record<string, unknown>)
				: undefined;
		this.log(LogLevel.INFO, message, ctx);
	}

	warn(message: string, context?: unknown): void {
		const ctx =
			context != null && typeof context === "object"
				? (context as Record<string, unknown>)
				: undefined;
		this.log(LogLevel.WARN, message, ctx);
	}

	error(message: string, error?: Error | unknown, context?: unknown): void {
		const baseContext =
			context != null && typeof context === "object"
				? (context as Record<string, unknown>)
				: {};

		const errorContext =
			error instanceof Error
				? {
						...baseContext,
						error: { message: error.message, stack: error.stack },
					}
				: baseContext;

		this.log(LogLevel.ERROR, message, errorContext);
	}
}

/** 本番ビルド用の何もしないロガー */
class NoOpLogger implements ILogger {
	debug(_message: string, _context?: unknown): void {}
	info(_message: string, _context?: unknown): void {}
	warn(_message: string, _context?: unknown): void {}
	error(_message: string, _error?: Error | unknown, _context?: unknown): void {}
}

/**
 * グローバルロガーインスタンス
 *
 * 開発環境では通常のLogger、本番環境ではNoOpLoggerを使用
 */
export const logger: ILogger = import.meta.env.DEV
	? Logger.getInstance()
	: new NoOpLogger();

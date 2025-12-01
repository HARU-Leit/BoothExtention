import type { ILogger } from "@/types";

// 各Feature向けにスコープ付きロガーを生成する
export function createScopedLogger(base: ILogger, scope: string): ILogger {
	const prefix = `[${scope}]`;

	return {
		debug(message, context) {
			base.debug(`${prefix} ${message}`, context);
		},
		info(message, context) {
			base.info(`${prefix} ${message}`, context);
		},
		warn(message, context) {
			base.warn(`${prefix} ${message}`, context);
		},
		error(message, error, context) {
			base.error(`${prefix} ${message}`, error, context);
		},
	};
}

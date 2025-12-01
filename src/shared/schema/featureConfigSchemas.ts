import { z } from "zod/mini";

const thresholdSchema = z.union([z.number(), z.array(z.number())]);

export const imageOptimizerConfigSchema = z.object({
	rootMargin: z.string(),
	threshold: thresholdSchema,
	prefetchLimit: z.number().check(z.nonnegative(), z.multipleOf(1)),
	enableLQIP: z.boolean(),
});

export const infiniteScrollConfigSchema = z.object({
	rootMargin: z.string(),
	threshold: z.number().check(z.minimum(0)),
	enabled: z.boolean(),
});

import { z } from "zod/mini";

const nonEmptyString = () => z.string().check(z.minLength(1));

export const trackingBlockerConfigSchema = z.object({
	enabled: z.boolean(),
	blockList: z.array(nonEmptyString()),
});

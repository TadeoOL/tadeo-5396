import { z } from "zod";

export const Uuid = z.uuid();
export const IsoDate = z.iso.date();

export const ErrorEnvelope = z.object({
  error: z.object({ code: z.string(), message: z.string(), requestId: Uuid }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

export const HealthResponse = z.object({ status: z.literal("ok") });
export type HealthResponse = z.infer<typeof HealthResponse>;

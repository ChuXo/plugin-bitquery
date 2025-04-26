import { z, ZodError } from "zod";
import { type IAgentRuntime } from "@elizaos/core";

/**
 * Schema to validate required environment variables or settings.
 */
const bitqueryEnvSchema = z.object({
    BITQUERY_CLIENT_ID: z.string().min(1, "Bitquery Client ID is required"),
    BITQUERY_CLIENT_SECRET: z.string().min(1, "Bitquery Client Secret is required"),
});

export type BitqueryConfig = z.infer<typeof bitqueryEnvSchema>;

/**
 * Validates and retrieves the Bitquery API keys.
 * Takes values from the IAgentRuntime or process.env as needed.
 *
 * @param runtime - The IAgentRuntime instance.
 * @returns {Promise<BitqueryConfig>} - The validated configuration.
 * @throws {Error} - If validation fails.
 */
export async function validateBitqueryConfig(runtime: IAgentRuntime): Promise<BitqueryConfig> {
    try {
        const config = {
            BITQUERY_CLIENT_ID: runtime.getSetting("BITQUERY_CLIENT_ID") || process.env.BITQUERY_CLIENT_ID,
            BITQUERY_CLIENT_SECRET: runtime.getSetting("BITQUERY_CLIENT_SECRET") || process.env.BITQUERY_CLIENT_SECRET,
        };

        return bitqueryEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof ZodError) {
            const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n");
            throw new Error(`Bitquery API configuration validation failed:\n${errorMessages}`);
        }
        throw error;
    }
}

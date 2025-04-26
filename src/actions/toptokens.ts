import {
    composeContext,
    generateObjectDeprecated,
    generateText,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";

import { TopToken } from "../bitquery/types/toppairs";
import { getTopTokensBitquery } from "../bitquery/toptoken";
import { toptokenParamTemplate, toptokenTemplate } from "../templates/toptoken";
import { validateBitqueryConfig } from "../environment";

const cache: { [chain: number]: { data: TopToken[]; timestamp: number } } = {}; // Cache object

// Enum representing all supported chains
enum SupportedChains {
    Ethereum = 1,
    BinanceSmartChain = 56,
    Base = 8453,
}

/**
 * Fetches the current market performance for a specific blockchain with caching.
 * Only supports chains defined in the SupportedChains enum.
 *
 * @param {SupportedChains} chain - The chain ID (Ethereum, BSC, base...).
 * @returns {Promise<TopPairResponse>} - The top volume tokens data.
 */
const fetchTopTokens = async (
    runtime: IAgentRuntime,
    chain: SupportedChains,
    limit: number
): Promise<TopToken[]> => {
    const now = Date.now();
    const cacheEntry = cache[chain];

    // Check if valid cached data is available
    const CACHE_DURATION_MINUTES =
        Number(runtime.character?.settings?.secrets?.CACHE_DURATION_MINUTES) ||
        0;
    if (
        cacheEntry &&
        now - cacheEntry.timestamp < CACHE_DURATION_MINUTES * 60 * 1000
    ) {
        console.log(`Returning cached data for chain ${chain}`);
        return cacheEntry.data;
    }

    let topVolume: TopToken[];

    try {
        // Fetch top volume tokens from the API
        topVolume = await getTopTokensBitquery(runtime, chain, limit);

        // Update cache with fresh data
        cache[chain] = { data: topVolume, timestamp: now };

        return topVolume;
    } catch (error) {
        console.error(
            `Error fetching top volume tokens data for chain ${chain}:`,
            error
        );
        throw new Error(
            `An error occurred while fetching the top volume tokens data for chain ${chain}.`
        );
    }
};

/**
 * Formats the market data for a specific blockchain using the top volume tokens.
 *
 * @param {SupportedChains} chain - The chain ID (Ethereum, BSC, Base).
 * @param {TopToken} topVolume - The top volume tokens data.
 * @returns {string} - A formatted string containing the market data.
 */
const formatMarketData = (
    chain: SupportedChains,
    topVolume: TopToken[]
): string => {
    const chainLabel =
        chain === SupportedChains.Base
            ? "Base"
            : chain === SupportedChains.BinanceSmartChain
              ? "Binance Smart Chain (BSC)"
              : "Ethereum";
    const fetchedAt = new Date().toLocaleString(); // Timestamp when data is fetched

    let marketKnowledge = `Top Tokens Performance on ${chainLabel} (fetched on ${fetchedAt}):\n`;
    marketKnowledge += formatSection("Top Tokens Performance:", topVolume);
    return marketKnowledge;
};
/**
 * Helper function to format a section of token data.
 *
 * @param {string} sectionTitle - The title of the section (e.g., "Top Gainer Tokens").
 * @param {TopToken[]} pairs - The array of token pairs to format.
 * @returns {string} - A formatted string for the section.
 */
const formatSection = (sectionTitle: string, pairs: TopToken[]): string => {
    if (!pairs || pairs.length === 0) {
        return `${sectionTitle}: No data available.\n`;
    }

    let formattedSection = `${sectionTitle}:\n`;

    if (pairs.length < 100) {
        formattedSection += pairs
            .map(
                (pair) =>
                    `Token name: ${pair.name || "N/A"}, ticker: ${pair.symbol}, address: ${pair.address}, ` +
                    `10m price change: ${pair.change_10m || "N/A"}%, ` +
                    `1h price change: ${pair.change_1h || "N/A"}%, ` +
                    `3h price change: ${pair.change_3h || "N/A"}%, ` +
                    `24h price change: ${pair.change_24h || "N/A"}%, ` +
                    `volume: ${pair.volume || 0}$, swaps: ${pair.swaps || 0}, ` +
                    `${pair.price ? `price (in USD): ${pair.price}$, ` : ""}` +
                    `${pair.marketCap ? `marketCap: ${pair.marketCap}, ` : ""}` +
                    `${pair.totalSupply ? `total supply: ${pair.totalSupply}, ` : ""}`
            )
            .join("\n");
    } else {
        formattedSection += pairs
            .map(
                (pair) =>
                    `Token name: ${pair.name || "N/A"}, ticker: ${pair.symbol}, ` +
                    `10m price change: ${pair.change_10m || "N/A"}%, ` +
                    `1h price change: ${pair.change_1h || "N/A"}%, ` +
                    `3h price change: ${pair.change_3h || "N/A"}%, ` +
                    `24h price change: ${pair.change_24h || "N/A"}%, ` +
                    `volume: ${pair.volume || 0}$, swaps: ${pair.swaps || 0}, ` +
                    `${pair.price ? `price (in USD): ${pair.price}$, ` : ""}` +
                    `${pair.marketCap ? `marketCap: ${pair.marketCap}, ` : ""}` +
                    `${pair.totalSupply ? `total supply: ${pair.totalSupply}, ` : ""}`
            )
            .join("\n");
    }

    formattedSection += "\n";
    return formattedSection;
};

export const getTopTokensAction = {
    name: "TopTokens",
    description:
        "query the top tokens performance on base, eth, arbitrum or bsc network",
    suppressInitialMessage: true,
    handler: async (
        _runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        console.log("getTopTokensAction called");
        // composeState
        if (!state) {
            state = (await _runtime.composeState(message)) as State;
        } else {
            state = await _runtime.updateRecentMessageState(state);
        }

        // extract params out of state / message
        const queryContext = composeContext({
            state,
            template: toptokenParamTemplate,
        });
        const params = await generateObjectDeprecated({
            runtime: _runtime,
            context: queryContext,
            modelClass: ModelClass.LARGE,
        });

        // Define the chains to be used (can be dynamically modified)
        const chainsToUse: number[] = [
            // _runtime.character.settings?.chains?.evm?.includes("ethereum") ||
            // _runtime.character.settings?.chains?.evm?.includes("eth")
            //     ? 1
            //     : null,
            // _runtime.character.settings?.chains?.evm?.includes("binance") ||
            // _runtime.character.settings?.chains?.evm?.includes("bnb") ||
            // _runtime.character.settings?.chains?.evm?.includes("bsc")
            //     ? 56
            //     : null,
            // _runtime.character.settings?.chains?.evm?.includes("base")
            //     ? 8453
            //     : null,
            ...params.chain,
        ];

        let onchainKnowledge = "";
        let toppairs: TopToken[];

        // Fetch market performance for each chain
        for (const chain of chainsToUse) {
            if (chain !== null) {
                console.log(
                    "query top volume tokens on chain: ",
                    chain ?? 8453
                );
                console.log("limit: ", params?.limit ?? 100);
                try {
                    const topVolume = await fetchTopTokens(
                        _runtime,
                        chain ?? 8453,
                        params?.limit ?? 100
                    );
                    const marketData = formatMarketData(
                        chain ?? 8453,
                        topVolume
                    );
                    onchainKnowledge += marketData + "\n";
                } catch (error) {
                    console.error(error);
                }
            }
        }
        if (onchainKnowledge !== "") {
            const context = composeContext({
                state: {
                    ...state,
                    onchainKnowledge,
                },
                template: toptokenTemplate,
            });
            const convictionResponse = await generateText({
                runtime: _runtime,
                context: context,
                modelClass: ModelClass.LARGE,
            });
            _runtime.messageManager.createMemory({
                userId: message.agentId,
                agentId: message.agentId,
                roomId: message.roomId,
                content: {
                    text: convictionResponse,
                },
            });
            callback?.({
                text: convictionResponse,
                content: {
                    data: {
                        timestamp: Date.now(),
                        toppairs: toppairs,
                    },
                    params: {
                        limit: params.limit,
                        chain: chainsToUse[0],
                    },
                },
            });
            return true;
        }
        return false;
    },
    // template: topvolumeTemplate,
    validate: async (_runtime: IAgentRuntime) => {
        try {
            await validateBitqueryConfig(_runtime);
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Analyze the latest on-chain performer!",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I successfully injected on-chain data into my mind. Here are the top gainers out of all: ETH 24h: 14%, 7d: 39% ...",
                    action: "QUERY_TOP_TOKENS_BY_VOLUME",
                },
            },
        ],
    ],
    similes: [
        "TOP_GAINER",
        "QUERY_TOP_TOKENS",
        "TOP_TOKENS",
        "QUERY_TOP_GAINER",
        "TOKEN_PRICE_CHANGE",
        "TOKEN_PERFORMANCE",
    ],
};

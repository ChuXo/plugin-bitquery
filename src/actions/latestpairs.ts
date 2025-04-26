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

import { TimePeriods } from "../bitquery/types/timeperiods";
import { TopPairResponse } from "../bitquery/types/toppairs";
import { getLatestPairsBitqueryNew } from "../bitquery/latestpairs";
import {
    latestPairsParamTemplate,
    latestPairsTemplate,
} from "../templates/latestpairs";
import { validateBitqueryConfig } from "../environment";

const cache: { [chain: number]: { data: TopPairResponse; timestamp: number } } =
    {}; // Cache object

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
const fetchLatestPairs = async (
    runtime: IAgentRuntime,
    chain: SupportedChains,
    timeperiod: TimePeriods,
    limit: number
): Promise<TopPairResponse> => {
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

    let latestPairs: TopPairResponse;

    try {
        // Fetch top volume tokens from the API
        latestPairs = await getLatestPairsBitqueryNew(
            runtime,
            chain,
            timeperiod,
            limit
        );

        // Update cache with fresh data
        cache[chain] = { data: latestPairs, timestamp: now };

        return latestPairs;
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
 * @param {TimePeriods} timeperiod - The time period (e.g., "24h").
 * @param {TopPairResponse} latestPairs - The top volume tokens data.
 * @returns {string} - A formatted string containing the market data.
 */
const formatMarketData = (
    chain: SupportedChains,
    timeperiod: TimePeriods,
    latestPairs: TopPairResponse
): string => {
    const chainLabel =
        chain === SupportedChains.Base
            ? "Base"
            : chain === SupportedChains.BinanceSmartChain
              ? "Binance Smart Chain (BSC)"
              : "Ethereum";
    const fetchedAt = new Date().toLocaleString(); // Timestamp when data is fetched

    let marketKnowledge = `Latest deployed Tokens by volume on ${chainLabel} in the past ${timeperiod} (fetched on ${fetchedAt}):\n`;
    marketKnowledge += formatSection("Latest Tokens", latestPairs, timeperiod);
    // console.log(marketKnowledge);
    return marketKnowledge;
};

/**
 * Helper function to format a section of token data.
 *
 * @param {string} sectionTitle - The title of the section (e.g., "Top Gainer Tokens").
 * @param {TopPairResponse} pairs - The array of token pairs to format.
 * @returns {string} - A formatted string for the section.
 */
const formatSection = (
    sectionTitle: string,
    pairs: TopPairResponse,
    timeperiod: TimePeriods
): string => {
    if (!pairs || pairs.length === 0) {
        return `${sectionTitle}: No data available.\n`;
    }

    let formattedSection = `${sectionTitle}:\n`;
    // do not include address when requesting over 100 tokens because of open ai api limit
    if (pairs.length < 100) {
        formattedSection += pairs
            .map(
                (pair) =>
                    `Token name: ${pair.name}, ticker: ${pair.symbol}, address: ${pair.address}, ${timeperiod} price change: ${pair.change}%, ${pair?.volume && Number(pair?.volume) > 0 ? `${timeperiod} volume: ${pair.volume}$,` : ""} swaps: ${pair?.swaps}, ${pair?.nativePrice ? `nativePrice (in native coin of chain): ${pair.nativePrice},` : ""} ${pair?.price ? `price (in usd): ${pair.price}$,` : ""} ${pair?.created ? `created: ${pair.created},` : ""} ${pair?.marketCap && Number(pair?.marketCap) !== 0 ? `marketCap: ${pair?.marketCap},` : ""} ${pair?.totalSupply && Number(pair?.totalSupply) !== 0 ? `totalsupply: ${pair.totalSupply},` : ""} ${pair?.quoteCurrency?.symbol ? `quoteCurrency: ${pair.quoteCurrency.symbol},` : ""}`
            )
            .join("\n");
    } else {
        formattedSection += pairs
            .map(
                (pair) =>
                    `Token name: ${pair.name}, ticker: ${pair.symbol}, ${timeperiod} price change: ${pair.change}%, ${pair?.volume && Number(pair?.volume) > 0 ? `${timeperiod} volume: ${pair.volume}$,` : ""} swaps: ${pair?.swaps}, ${pair?.nativePrice ? `nativePrice (in native coin of chain): ${pair.nativePrice},` : ""} ${pair?.price ? `price (in usd): ${pair.price}$,` : ""} ${pair?.created ? `created: ${pair.created},` : ""} ${pair?.marketCap && Number(pair?.marketCap) !== 0 ? `marketCap: ${pair?.marketCap},` : ""} ${pair?.totalSupply && Number(pair?.totalSupply) !== 0 ? `totalsupply: ${pair.totalSupply},` : ""} ${pair?.quoteCurrency?.symbol ? `quoteCurrency: ${pair.quoteCurrency.symbol},` : ""}`
            )
            .join("\n");
    }
    formattedSection += "\n";
    return formattedSection;
};

export const getLatestPairsAction = {
    name: "LATEST_DEPLOYED_TOKENS",
    description: "query the latest deployed token on-chain",
    suppressInitialMessage: true,
    handler: async (
        _runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        console.log("getLatestPairsAction called");
        // composeState
        if (!state) {
            state = (await _runtime.composeState(message)) as State;
        } else {
            state = await _runtime.updateRecentMessageState(state);
        }

        // extract params out of state / message
        const queryContext = composeContext({
            state,
            template: latestPairsParamTemplate,
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

        // Define timeframes for market performance
        const timeperiods: TimePeriods[] = ["24h"]; // "1h",  "3h", "12h", "24h", "7d", "30d", "1y"

        let onchainKnowledge = "";
        let toppairs: TopPairResponse;

        // Fetch market performance for each chain
        for (const chain of chainsToUse) {
            if (chain !== null) {
                for (const timeperiod of timeperiods) {
                    console.log(
                        "query latest tokens on chain: ",
                        chain ?? 8453
                    );
                    console.log("timeperiod: ", timeperiod ?? "24h");
                    console.log("limit: ", params?.limit ?? 500);
                    try {
                        const latestPairs = await fetchLatestPairs(
                            _runtime,
                            chain ?? 8453,
                            timeperiod ?? "24h",
                            params?.limit ?? 500
                        );
                        const marketData = formatMarketData(
                            chain ?? 8453,
                            timeperiod ?? "24h",
                            latestPairs
                        );
                        onchainKnowledge += marketData + "\n";
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
        }
        if (onchainKnowledge !== "") {
            const context = composeContext({
                state: {
                    ...state,
                    onchainKnowledge,
                },
                template: latestPairsTemplate,
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
    // template: toptokensTemplate,
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
                    text: "Get the latest pairs deployed on base chain!",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I successfully queried the latest pairs deployed on base chain!.",
                    action: "QUERY_LATEST_PAIRS",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Which are the newest tokens on-chain?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I found the newest tokens on-chain!",
                    action: "QUERY_LATEST_TOKENS",
                },
            },
            // {
            //     user: "{{user1}}",
            //     content: {
            //         text: "What are the top gainers on base chain?",
            //     },
            // },
            // {
            //     user: "{{user2}}",
            //     content: {
            //         text: "1. {{ticker}} 24h: {{price change}} MCAP: {marketcap}}, 2. {{ticker}} 24h: {{price change}} MCAP: {{marketcap}}, 3. {{ticker}} 24h: {{price change}} MCAP: {{marketcap}}",
            //         action: "QUERY_TOP_TOKENS_BY_VOLUME",
            //     },
            // },
            // {
            //     user: "{{user1}}",
            //     content: {
            //         text: "Top tokens of the last 7 days?",
            //     },
            // },
            // {
            //     user: "{{user2}}",
            //     content: {
            //         text: "1. {{ticker}} 7d: {{price change}} MCAP: {marketcap}}, 2. {{ticker}} 7d: {{price change}} MCAP: {{marketcap}}, 3. {{ticker}} 7d: {{price change}} MCAP: {{marketcap}}",
            //         action: "QUERY_TOP_TOKENS_BY_VOLUME",
            //     },
            // },
        ],
    ],
    similes: [
        "QUERY_LATEST_PAIRS",
        "QUERY_LATEST_TOKENS",
        "LATEST_TOKENS",
        "LATEST_PAIRS",
        "NEWEST_DEPLOYED",
    ],
};

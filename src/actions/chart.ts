import {
    composeContext,
    generateObjectDeprecated,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";
import { getTokenChart } from "../bitquery/chart";
import { TokenChart } from "../bitquery/types/tokenchart";
import { TimePeriods } from "../bitquery/types/timeperiods";
import {
    tokenChartParamTemplate,
    tokenChartTemplate,
} from "../templates/chart";
import { validateBitqueryConfig } from "../environment";

const cache: { [key: string]: { data: TokenChart; timestamp: number } } = {}; // Cache object

enum SupportedChains {
    Ethereum = 1,
    BinanceSmartChain = 56,
    Base = 8453,
}

/**
 * Fetches the historical token price data for a specific blockchain, base currency, and time period.
 *
 * @param {IAgentRuntime} runtime - The runtime instance.
 * @param {number} chain - The chain ID (e.g., Ethereum, Binance Smart Chain).
 * @param {string} baseCurrency - The base currency (e.g., ETH, BTC, Ethereum, 0x....).
 * @param {TimePeriods} timeperiod - The time period (e.g., "7d", "30d").
 * @returns {Promise<TokenChart>} - The historical token price data.
 */
const fetchTokenChart = async (
    runtime: IAgentRuntime,
    chain: number,
    baseCurrency: string,
    timeperiod: TimePeriods
): Promise<TokenChart> => {
    const cacheKey = `${chain}-${baseCurrency}-${timeperiod}`;
    const now = Date.now();
    const cacheEntry = cache[cacheKey];

    // Check if valid cached data is available
    const CACHE_DURATION_MINUTES =
        Number(runtime.character?.settings?.secrets?.CACHE_DURATION_MINUTES) ||
        0;
    if (
        cacheEntry &&
        now - cacheEntry.timestamp < CACHE_DURATION_MINUTES * 60 * 1000
    ) {
        console.log(`Returning cached data for ${cacheKey}`);
        return cacheEntry.data;
    }

    try {
        // Fetch historical token price data from the API
        const tokenChartData = await getTokenChart(
            runtime,
            chain,
            baseCurrency,
            timeperiod
        );

        // Update cache with fresh data
        cache[cacheKey] = { data: tokenChartData, timestamp: now };

        return tokenChartData;
    } catch (error) {
        console.error(
            `Error fetching token chart data for chain ${chain}, base currency ${baseCurrency}, and time period ${timeperiod}:`,
            error
        );
        throw new Error(
            `An error occurred while fetching the token chart data for chain ${chain}, base currency ${baseCurrency}, and time period ${timeperiod}.`
        );
    }
};

/**
 * Formats the historical token price data into a human-readable string.
 *
 * @param {number} chain - The chain ID (e.g., Ethereum, Binance Smart Chain).
 * @param {string} baseCurrency - The base currency (e.g., ETH, BTC).
 * @param {TokenChart} chartData - The historical token price data.
 * @returns {string} - A formatted string containing the historical token price data.
 */
const formatTokenChartData = (
    chain: number,
    baseCurrency: string,
    chartData: TokenChart
): string => {
    const chainLabel =
        chain === SupportedChains.Ethereum
            ? "Ethereum"
            : chain === SupportedChains.BinanceSmartChain
              ? "Binance Smart Chain (BSC)"
              : "Base";

    let formattedData = `Historical price chart for ${baseCurrency} on ${chainLabel}:\n`;
    formattedData += chartData
        .map((price) => `Time: ${price.time}, Price: $${price.close}`)
        .join("\n");

    return formattedData;
};

export const getTokenChartAction = {
    name: "TOKEN_CHART",
    description:
        "Query historical token prices to analyse the chart of a token on a specific blockchain",
    suppressInitialMessage: true,
    handler: async (
        _runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        console.log("getTokenChartAction called");

        if (!state) {
            state = (await _runtime.composeState(message)) as State;
        } else {
            state = await _runtime.updateRecentMessageState(state);
        }

        const queryContext = composeContext({
            state,
            template: tokenChartParamTemplate,
        });
        const params = await generateObjectDeprecated({
            runtime: _runtime,
            context: queryContext,
            modelClass: ModelClass.LARGE,
        });

        const { chain, baseCurrency, timeperiod } = params;

        try {
            const chartData = await fetchTokenChart(
                _runtime,
                chain,
                baseCurrency,
                timeperiod
            );
            const formattedData = formatTokenChartData(
                chain,
                baseCurrency,
                chartData
            );

            const context = composeContext({
                state: {
                    ...state,
                    chartData: formattedData,
                },
                template: tokenChartTemplate,
            });

            const processedResponse = await generateText({
                runtime: _runtime,
                context,
                modelClass: ModelClass.LARGE,
            });

            _runtime.messageManager.createMemory({
                userId: message.agentId,
                agentId: message.agentId,
                roomId: message.roomId,
                content: {
                    text: processedResponse,
                },
            });
            // console.log(formattedData);
            callback?.({
                text: processedResponse,
                content: {
                    data: {
                        timestamp: Date.now(),
                        chartData,
                    },
                    params,
                },
            });
            return true;
        } catch (error) {
            console.error(error);
        }
        return false;
    },

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
                    text: "Show me the historical price chart for ETH on Ethereum chain for the last 7 days.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Here's the price chart for ETH on Chain 1 (Ethereum) for the last 7 days: \nTime: 2024-01-01, Close Price: $2300\nTime: 2024-01-02, Close Price: $2400 ...",
                    action: "TOKEN_CHART",
                },
            },
        ],
    ],

    similes: [
        "TOKEN_CHART",
        "TOKEN_PRICE_HISTORY",
        "QUERY_HISTORICAL_PRICES",
        "CRYPTO_PRICE_TIMELINE",
        "TOKEN_TREND_ANALYSIS",
    ],
};

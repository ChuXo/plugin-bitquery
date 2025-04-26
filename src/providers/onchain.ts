import { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { getTopGainersBitquery } from "../bitquery/topgainer";
import { TopPairResponse } from "../bitquery/types/toppairs";
import { getTopPairsByVolBitquery } from "../bitquery/topvolume";
import { getTopLosersBitquery } from "../bitquery/toplosers";
import { TimePeriods } from "../bitquery/types/timeperiods";

const cache: { [chain: number]: { data: string; timestamp: number } } = {}; // Cache object

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
 * @returns {Promise<string>} - A formatted string containing top gainers, top volume tokens, and top losers.
 */
const getCurrentMarketPerformance = async (
    runtime: IAgentRuntime,
    chain: SupportedChains,
    timeperiod: TimePeriods
): Promise<string> => {
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

        // Return cached market data with original fetched timestamp inside
        return `The following data is the latest crypto market data you know:\n\n${cacheEntry.data}\nAnalyze the data to make reliable expressions or decisions and use this data as your reference. This is one of the most important jobs you love to provide those informations in a professional way.`;
    }

    let marketKnowledge = "";
    let topGainers: TopPairResponse;
    let topVolume: TopPairResponse;
    let topLosers: TopPairResponse;

    const chainLabel =
        chain === SupportedChains.Base
            ? "Base"
            : chain === SupportedChains.BinanceSmartChain
              ? "Binance Smart Chain (BSC)"
              : "Ethereum";
    const fetchedAt = new Date(now).toLocaleString(); // Timestamp when data is fetched

    marketKnowledge += `Market performance on ${chainLabel} in the past ${timeperiod} (fetched on ${fetchedAt}):\n`;

    try {
        if (
            chain === SupportedChains.Ethereum ||
            chain === SupportedChains.BinanceSmartChain
        ) {
            // For Ethereum (1) and Binance Smart Chain (56), fetch top volume, gainers, and losers
            [topVolume, topGainers, topLosers] = await Promise.all([
                getTopPairsByVolBitquery(runtime, chain, 40, timeperiod), // you need the limit to be enough to have enough tokens
                getTopGainersBitquery(runtime, chain, 50, timeperiod), // min 50
                getTopLosersBitquery(runtime, chain, 40, timeperiod),
            ]);

            marketKnowledge += formatSection("Top Volume Tokens", topVolume);
            marketKnowledge += formatSection("Top Gainer Tokens", topGainers);
            marketKnowledge += formatSection("Top Loser Tokens", topLosers);
        } else {
            // For other chains, only fetch top volume tokens
            topVolume = await getTopPairsByVolBitquery(
                runtime,
                chain,
                100,
                timeperiod
            );

            marketKnowledge += formatSection("Top Volume Tokens", topVolume);

            // Uncomment these lines when ready to include gainers and losers for other chains
            /*
            [topGainers, topLosers] = await Promise.all([
                getTopGainersBitquery(runtime, chain, 50, timeperiod),
                getTopLosersBitquery(runtime, chain, 50, timeperiod),
            ]);

            marketKnowledge += formatSection("Top Gainer Tokens", topGainers);
            marketKnowledge += formatSection("Top Loser Tokens", topLosers);
            */
        }
    } catch (error) {
        console.error(
            `Error fetching market performance data for chain ${chain}:`,
            error
        );
        return `An error occurred while fetching the market performance data for ${chainLabel}.`;
    }

    // Update cache with fresh data
    cache[chain] = { data: marketKnowledge, timestamp: now };

    console.log(marketKnowledge);

    return `The following data is the latest crypto market data you know:\n\n${marketKnowledge}\nAnalyze the data to make reliable expressions or decisions and use this data as your reference. This is one of the most important jobs you love to provide those informations in a professional way.`;
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
    pairs: TopPairResponse
): string => {
    if (!pairs || pairs.length === 0) {
        return `${sectionTitle}: No data available.\n`;
    }

    let formattedSection = `${sectionTitle}:\n`;
    formattedSection += pairs
        .map(
            (pair) =>
                `  Token name: ${pair.name}, ticker: ${pair.symbol}, address: ${pair.address}, 24h price change: ${pair.change}%, 24h volume: ${pair.volume}$, swaps: ${pair?.swaps}, ${pair?.nativePrice ? `nativePrice (in native coin of chain): ${pair.nativePrice},` : ""} ${pair?.price ? `price (in usd): ${pair.price}$,` : ""} ${pair?.marketCap && Number(pair?.marketCap) !== 0 ? `marketCap: ${pair?.marketCap},` : ""} ${pair?.totalSupply && Number(pair?.totalSupply) !== 0 ? `totalsupply: ${pair.totalSupply},` : ""} `
        )
        .join("\n");
    formattedSection += "\n";
    return formattedSection;
};

export const onchainProvider: Provider = {
    /**
     * Main provider function that returns on-chain data.
     */
    get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State) => {
        if (
            (_runtime.character.settings?.secrets?.BITQUERY_CLIENT_ID &&
                _runtime.character.settings?.secrets?.BITQUERY_CLIENT_SECRET) ||
            (process.env?.BITQUERY_CLIENT_SECRET &&
                process.env?.BITQUERY_CLIENT_ID)
        ) {
            // Define the chains to be used (can be dynamically modified)
            const chainsToUse: SupportedChains[] = [
                _runtime.character.settings?.chains?.evm?.includes(
                    "ethereum"
                ) || _runtime.character.settings?.chains?.evm?.includes("eth")
                    ? SupportedChains.Ethereum
                    : null,
                _runtime.character.settings?.chains?.evm?.includes("binance") ||
                _runtime.character.settings?.chains?.evm?.includes("bnb") ||
                _runtime.character.settings?.chains?.evm?.includes("bsc")
                    ? SupportedChains.BinanceSmartChain
                    : null,
                _runtime.character.settings?.chains?.evm?.includes("base")
                    ? SupportedChains.Base
                    : null,
            ];

            // Define timeframes for market performance
            const timeperiods: TimePeriods[] = ["24h"]; // "1h",  "3h", "12h", "24h", "7d", "30d", "1y"

            let onchainKnowledge = "";

            // Fetch market performance for each chain
            for (const chain of chainsToUse) {
                if (chain !== null) {
                    for (const timeperiod of timeperiods) {
                        console.log(
                            "fetch market performance for chain: ",
                            chain
                        );
                        console.log("timeperiod: ", timeperiod);
                        const marketKnowledge =
                            await getCurrentMarketPerformance(
                                _runtime,
                                chain,
                                timeperiod
                            );
                        onchainKnowledge += marketKnowledge + "\n";
                    }
                }
            }

            // Placeholder: Add other useful on-chain data (e.g., latest deployed pairs) here in future
            // const latestDeployedPairs = await getLatestDeployedPairs(...);
            // onchainKnowledge += latestDeployedPairs;

            return onchainKnowledge;
        }
        return "No Bitquery API keys found! Add 2 secrets: for bitquery v2: BITQUERY_CLIENT_ID, BITQUERY_CLIENT_SECRET to your character settings or .env.";
    },
};

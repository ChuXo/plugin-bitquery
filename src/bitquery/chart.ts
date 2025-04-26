import { BitqueryAPIVersion, fetchBitquery } from "./utils/client";
import { chainMapBitqueryV2 } from "./config/chainmap";

import { IAgentRuntime } from "@elizaos/core";
import { TimePeriods } from "./types/timeperiods";
import { TokenChart, TokenPrice } from "./types/tokenchart";
import {
    ChainDexProtocols,
    ChainQuoteCurrencies,
    NativeCoinOfChain,
    StableCoinsOfChain,
    WrappedNativeCoinOfChain,
} from "./config/chainaddresses";

export async function getTokenChart(
    runtime: IAgentRuntime,
    chain: number,
    baseCurrency: string,
    timeperiod: TimePeriods,
    quoteCurrency?: string
): Promise<TokenChart> {
    const chainid = chain
    const network = chainMapBitqueryV2.get(chainid.toString());
    console.log(network)
    if (!network) throw new Error("Unsupported chain");

    const nativeCoin = NativeCoinOfChain.get(Number(chain))?.symbol || null;
    const wrappedNativeCoin =
    WrappedNativeCoinOfChain.get(Number(chain))?.symbol || null;
    let quotecurrency = WrappedNativeCoinOfChain.get(Number(chain))?.address || null;

    if (!nativeCoin || !wrappedNativeCoin) {
        console.error(
            `Missing native or wrapped native coin for chain ${chain}`
        );
    }

    const isNativeOrWrapped =
        baseCurrency?.toLowerCase() === nativeCoin?.toLowerCase() ||
        baseCurrency?.toLowerCase() === wrappedNativeCoin?.toLowerCase() ||
        baseCurrency?.toLowerCase() ===
            WrappedNativeCoinOfChain.get(chain)?.address?.toLowerCase() ||
        baseCurrency?.toLowerCase() ===
            NativeCoinOfChain.get(chain)?.address?.toLowerCase() ||
        baseCurrency?.toLowerCase() ===
            NativeCoinOfChain.get(chain)?.name?.toLowerCase() ||
        baseCurrency?.toLowerCase() ===
            WrappedNativeCoinOfChain.get(chain)?.name?.toLowerCase();

    quotecurrency = isNativeOrWrapped
        ? StableCoinsOfChain.get(Number(chain))?.[0]?.address || null
        : ChainQuoteCurrencies.get(Number(chain))?.[0] || null;

    if (!quotecurrency) {
        throw new Error(`No available quote currencies for chain ${chain}`);
    }

    const dexProtocols = ChainDexProtocols.get(Number(chain))!.map((p) => p.address);

    let interval = "minutes";
    let intervalCount = 10;
    let limit = 96;
    let orderBy = "Block_Time";

    const from = new Date(Date.now());

    switch (timeperiod) {
        case "1h":
            from.setHours(from.getHours() - 1);
            intervalCount = 1;
            limit = 60;
            break;
        case "3h":
            from.setHours(from.getHours() - 3);
            intervalCount = 5;
            limit = 36;
            break;
        case "12h":
            from.setHours(from.getHours() - 12);
            intervalCount = 10;
            limit = 72;
            break;
        case "24h":
            from.setDate(from.getDate() - 1);
            break;
        case "7d":
            from.setDate(from.getDate() - 7);
            interval = "hours";
            intervalCount = 1;
            limit = 168;
            break;
        case "30d":
            from.setDate(from.getDate() - 30);
            interval = "hours";
            intervalCount = 4;
            limit = 180;
            break;
        case "1y":
            from.setFullYear(from.getFullYear() - 1);
            interval = "days";
            intervalCount = 1;
            limit = 365;
            orderBy = "Block_Date";
            break;
        default:
            throw new Error("Invalid timeperiod");
    }

    const fromISO =
        orderBy === "Block_Time"
            ? from.toISOString()
            : from.toISOString().split("T")[0];
    const till =
        orderBy === "Block_Time"
            ? new Date().toISOString()
            : new Date().toISOString().split("T")[0];
    console.log(`From ISO: ${fromISO}, Till ISO: ${till}`);
    const blockTimeField = orderBy === "Block_Time" ? "Time" : "Date";
    const blockTimeType = orderBy === "Block_Time" ? "DateTime" : "String";

    if (!quoteCurrency) {
        quoteCurrency = quotecurrency;
    } else if (/^0x[a-fA-F0-9]{40}$/.test(quoteCurrency)) {
        // Keep address as is
    } else if (/^[A-Z]{1,6}$/.test(quoteCurrency)) {
        quoteCurrency = quoteCurrency.toUpperCase();
    } else {
        quoteCurrency =
            quoteCurrency.charAt(0).toUpperCase() +
            quoteCurrency.slice(1).toLowerCase();
    }

    let baseCurrencyCondition = `Currency: {Symbol: {includes: $baseCurrency}}`;
    let quoteCurrencyCondition = `Side: {Currency: {SmartContract: {is: $quoteCurrency}}}`;

    if (/^0x[a-fA-F0-9]{40}$/.test(baseCurrency)) {
        baseCurrencyCondition = `Currency: {SmartContract: {is: $baseCurrency}}`;
    } else if (baseCurrency.length < 42 && /[a-z]/.test(baseCurrency)) {
        baseCurrencyCondition = `Currency: {Name: {includes: $baseCurrency}}`;
    }

    if (/^[A-Z]{1,6}$/.test(quoteCurrency)) {
        quoteCurrencyCondition = `Side: {Currency: {Symbol: {includes: $quoteCurrency}}}`;
    } else if (quoteCurrency.length < 42 && /[a-z]/.test(quoteCurrency)) {
        quoteCurrencyCondition = `Side: {Currency: {Name: {includes: $quoteCurrency}}}`;
    }

    const whereCondition = `where: {Trade: {${baseCurrencyCondition}, ${quoteCurrencyCondition}, Price: {gt: 0}, Dex: {OwnerAddress: {in: $exchangeAddresses}}}, Block: {${blockTimeField}: {since: $from, till: $till}}}`;

    const query = `
    query ($network: evm_network, $baseCurrency: String, $quoteCurrency: String, $from: ${blockTimeType}, $till: ${blockTimeType}, $exchangeAddresses: [String!]) {
        EVM(dataset: combined, network: $network) {
            DEXTradeByTokens(
                limit: {count: ${limit}}
                orderBy: {descendingByField: "${orderBy}"}
                ${whereCondition}
            ) {
                Block {
                    ${
                        blockTimeField === "Time"
                            ? `Time(interval: {in: ${interval}, count: ${intervalCount}})`
                            : "Date"
                    }
                }
                volume: sum(of: Trade_Amount)
                Trade {
                    close: PriceInUSD(maximum: Block_Number)
                }
            }
        }
    }`;

    const variables = {
        network,
        baseCurrency,
        quoteCurrency,
        from: fromISO,
        till,
        exchangeAddresses: dexProtocols,
    };
    console.log("variables:", variables);
    // console.log("query:", query);
    const payload = JSON.stringify({
        query,
        variables,
    });

    const response = await fetchBitquery(
        runtime,
        BitqueryAPIVersion.v2,
        payload,
        "TOKEN HISTORIC PRICE"
    );

    if (!response.data?.EVM?.DEXTradeByTokens) return [];
    const result = response.data.EVM.DEXTradeByTokens.map(
        (item: any): TokenPrice => ({
            time: item.Block?.[blockTimeField] ?? "",
            close: item.Trade?.close ?? 0,
        })
    ).sort((a, b) => (a.time > b.time ? 1 : -1));
    // console.log("resutl:", result);
    console.log(result.length);
    return result;
}

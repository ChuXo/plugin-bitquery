import { IAgentRuntime } from "@elizaos/core";
import {
    ChainDexProtocols,
    ChainQuoteCurrencies,
    StableCoinsOfChain,
    WrappedNativeCoinOfChain,
} from "./config/chainaddresses";
import { chainMapBitqueryV2 } from "./config/chainmap";
import { BitqueryAPIVersion, fetchBitquery } from "./utils/client";

// Bitquery v2
export async function getTokenPricesBitqueryNew(
    runtime: IAgentRuntime,
    chain: number,
    addresses: string[],
    useStableCoinQuotecurency: boolean = false
) {
    const network = chainMapBitqueryV2.get(chain.toString() as string);
    const quotecurrency = useStableCoinQuotecurency
        ? StableCoinsOfChain.get(chain)?.[0]?.address
        : ChainQuoteCurrencies.get(chain)?.[0];
    const dexProtocols = ChainDexProtocols.get(chain)!.map((p) => p.address);
    const variables = {
        network: network,
        baseCurrency: addresses,
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        quoteCurrencies: [quotecurrency],
    };
    //             where: {Trade: {Currency: {SmartContract: {in: $baseCurrencies}, Symbol: {}}, Price: {gt: 0}, Amount: {gt: "0.000000001"}}, Block: {Date: {since: $from}}}

    const payload = JSON.stringify({
        query: `
      query ($network: evm_network, $baseCurrency: [String!], $from: DateTime, $quoteCurrencies: [String!]) {
  EVM(dataset: combined, network: $network) {
    DEXTradeByTokens(
      where: {Trade: {Currency: {SmartContract: {in: $baseCurrency}}, Side: {Currency: {SmartContract: {in: $quoteCurrencies}}}}, Block: {Time: {since: $from}}}
      limitBy: {by: [Trade_Currency_SmartContract, Trade_Side_Currency_SmartContract], count: 1}
      orderBy: {descending: Block_Time}
    ) {
      ChainId
      Trade {
        usd: PriceInUSD(maximum: Trade_PriceInUSD)
        actual: Price
        open: PriceInUSD(minimum: Block_Number)
        close: PriceInUSD(maximum: Block_Number)
        Side {
          Currency {
            Symbol
          }
        }
        Currency {
          Symbol
          SmartContract
        }
      }
    }
  }
}
        `,
        variables,
    });

    const data = await fetchBitquery(
        runtime,
        BitqueryAPIVersion.v2,
        payload,
        "getTokenPricesBitqueryNew"
    );
    if (data && data?.data?.EVM.DEXTradeByTokens) {
        return data?.data?.EVM.DEXTradeByTokens.map((t: any) => {
            return {
                address: t?.Trade?.Currency?.SmartContract,
                usd: Number(t?.Trade?.usd),
            };
        }) as { address: string; usd: number }[];
    }
}

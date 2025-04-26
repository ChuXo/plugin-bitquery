import { cutToDigits } from "./utils/cuttodigits";
import { BitqueryAPIVersion, fetchBitquery } from "./utils/client";
import { chainMapBitqueryV2 } from "./config/chainmap";
import {
    ChainDexProtocols,
    ChainQuoteCurrencies,
} from "./config/chainaddresses";
import { IAgentRuntime } from "@elizaos/core";
import { getWeb3TotalSupply } from "./totalsupply";
import BigNumber from "bignumber.js";
import { TopToken } from "./types/toppairs";

function calcPercentage(startPrice: number, endPrice: number) {
    const percent = ((endPrice - startPrice) / startPrice) * 100;
    return !isNaN(percent) ? percent.toFixed(2) : null;
}

export async function getTopTokensBitquery(
    runtime: IAgentRuntime,
    chain: number,
    limit: number,
    minSwaps = 100
): Promise<TopToken[] | null> {
    const variables = {
        network: chainMapBitqueryV2.get(chain.toString())!,
        limit: limit,
        time_10min_ago: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        time_1h_ago: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        time_3h_ago: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        time_6h_ago: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        time_12h_ago: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        time_24h_ago: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        time_7d_ago: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        time_30d_ago: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        time_ago: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        usdc: ChainQuoteCurrencies.get(chain)![1],
        usdt: ChainQuoteCurrencies.get(chain)![2],
        weth: ChainQuoteCurrencies.get(chain)![0],
        eth: "0x",
        min_count: "100",
    };

    const payload = JSON.stringify({
        query: `query pairs($limit: Int, $min_count: String, $network: evm_network, $time_10min_ago: DateTime, $time_1h_ago: DateTime, $time_3h_ago: DateTime, $time_6h_ago: DateTime, $time_12h_ago: DateTime, $time_24h_ago: DateTime, $time_7d_ago: DateTime, $time_30d_ago: DateTime, $time_ago: DateTime, $eth: String!, $weth: String!, $usdc: String!, $usdt: String!) {
  EVM(network: $network) {
    DEXTradeByTokens(
      where: {Block: {Time: {since: $time_ago}}, any: [{Trade: {Side: {Currency: {SmartContract: {is: $eth}}}}}, {Trade: {Side: {Currency: {SmartContract: {is: $usdt}}}, Currency: {SmartContract: {notIn: [$eth]}}}}, {Trade: {Side: {Currency: {SmartContract: {is: $usdc}}}, Currency: {SmartContract: {notIn: [$eth, $usdt]}}}}, {Trade: {Side: {Currency: {SmartContract: {is: $weth}}}, Currency: {SmartContract: {notIn: [$eth, $usdc, $usdt]}}}}, {Trade: {Side: {Currency: {SmartContract: {notIn: [$usdc, $usdt, $weth, $eth]}}}, Currency: {SmartContract: {notIn: [$usdc, $usdt, $weth, $eth]}}}}]}
      orderBy: {descendingByField: "usd"}
      limit: {count: $limit}
    ) {
      Trade {
        Currency {
          Symbol
          Name
          SmartContract
          ProtocolName
        }
        Side {
          Currency {
            Symbol
            Name
            SmartContract
            ProtocolName
          }
        }
        price_last: PriceInUSD(maximum: Block_Number)
        price_10min_ago: PriceInUSD(
          maximum: Block_Number
          if: {Block: {Time: {before: $time_10min_ago}}}
        )
        price_1h_ago: PriceInUSD(
          maximum: Block_Number
          if: {Block: {Time: {before: $time_1h_ago}}}
        )
        price_3h_ago: PriceInUSD(
          maximum: Block_Number
          if: {Block: {Time: {before: $time_3h_ago}}}
        )
        price_6h_ago: PriceInUSD(
          maximum: Block_Number
          if: {Block: {Time: {before: $time_6h_ago}}}
        )
        price_12h_ago: PriceInUSD(
          maximum: Block_Number
          if: {Block: {Time: {before: $time_12h_ago}}}
        )
        price_24h_ago: PriceInUSD(
          maximum: Block_Number
          if: {Block: {Time: {before: $time_24h_ago}}}
        )
        price_7d_ago: PriceInUSD(
          maximum: Block_Number
          if: {Block: {Time: {before: $time_7d_ago}}}
        )
        price_30d_ago: PriceInUSD(
          maximum: Block_Number
          if: {Block: {Time: {before: $time_30d_ago}}}
        )
      }
      dexes: uniq(of: Trade_Dex_OwnerAddress)
      amount: sum(of: Trade_Side_Amount)
      usd: sum(of: Trade_Side_AmountInUSD)
      sellers: uniq(of: Trade_Seller)
      buyers: uniq(of: Trade_Buyer)
      count(selectWhere: {ge: $min_count})
    }
  }
}`,
        variables,
    });

    const data = await fetchBitquery(runtime, BitqueryAPIVersion.v2, payload);

    if (data && data?.data?.EVM?.DEXTradeByTokens) {
        const filteredTrades = data?.data?.EVM?.DEXTradeByTokens.filter(
            (t: any) => t.count > minSwaps
        );
        const result: TopToken[] = await Promise.all(
            filteredTrades.map(async (c: any) => {
                let totalSupply = null;
                if (
                    process.env.INFURA_API_KEY ||
                    runtime?.character?.settings?.secrets?.["INFURA_API_KEY"]
                ) {
                    try {
                        totalSupply = await getWeb3TotalSupply(
                            runtime,
                            chain,
                            c.Trade.Currency.SmartContract
                        );
                    } catch (e) {
                        console.log(e);
                    }
                }
                const currentPrice = +c.Trade.price_last || null;

                return {
                    symbol: c.Trade.Currency.Symbol,
                    address: c.Trade.Currency.SmartContract,
                    decimals: null, // Adjust if decimals are required from a source
                    name: c.Trade.Currency.Name || null,
                    priceType:
                        `${calcPercentage(c.Trade.price_30d_ago, currentPrice)}`.substring(
                            0,
                            1
                        ) === "-"
                            ? "-"
                            : "+",
                    price: currentPrice,
                    change_10m: calcPercentage(
                        c.Trade.price_10min_ago,
                        currentPrice
                    ),
                    change_1h: calcPercentage(
                        c.Trade.price_1h_ago,
                        currentPrice
                    ),
                    change_3h: calcPercentage(
                        c.Trade.price_3h_ago,
                        currentPrice
                    ),
                    change_6h: calcPercentage(
                        c.Trade.price_6h_ago,
                        currentPrice
                    ),
                    change_12h: calcPercentage(
                        c.Trade.price_12h_ago,
                        currentPrice
                    ),
                    change_24h: calcPercentage(
                        c.Trade.price_24h_ago,
                        currentPrice
                    ),
                    change_7d: calcPercentage(
                        c.Trade.price_7d_ago,
                        currentPrice
                    ),
                    change_30d: calcPercentage(
                        c.Trade.price_30d_ago,
                        currentPrice
                    ),
                    marketCap: totalSupply
                        ? new BigNumber(currentPrice)
                              .times(new BigNumber(totalSupply))
                              .toFixed(0)
                        : null,
                    totalSupply: totalSupply
                        ? new BigNumber(totalSupply).toFixed(0)
                        : null,
                    swaps: c.count,
                    buyers: c.buyers,
                    sellers: c.sellers,
                    volume: c.usd, // Corrected field
                    quoteCurrency: {
                        symbol: c.Trade.Side.Currency.Symbol,
                        address: c.Trade.Side.Currency.SmartContract,
                    },
                    protocol: c.Trade.Currency.ProtocolName || null,
                    protocolType: c.Trade.Currency.ProtocolName || null,
                };
            })
        );
        // console.log(result);
        return result;
    }
    return null;
}

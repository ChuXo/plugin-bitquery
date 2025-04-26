import { TimePeriods } from "./types/timeperiods";
import { cutToDigits } from "./utils/cuttodigits";
import { TopPairResponse } from "./types/toppairs";
import { BitqueryAPIVersion, fetchBitquery } from "./utils/client";
import { chainMapBitqueryV1, chainMapBitqueryV2 } from "./config/chainmap";
import {
    ChainDexProtocols,
    ChainQuoteCurrencies,
    WrappedNativeCoinOfChain,
} from "./config/chainaddresses";
import { IAgentRuntime } from "@elizaos/core";
import { getTokenPricesBitqueryNew } from "./prices";
import BigNumber from "bignumber.js";

function calcPercentage(startprice: number, endprice: number) {
    const percent = ((endprice - startprice) / startprice) * 100;

    if (!isNaN(percent)) {
        return percent.toFixed(2);
    } else {
        return null;
    }
}

export async function getTopLosersBitquery(
    runtime: IAgentRuntime,
    chain: number,
    limit: number,
    timeperiod?: TimePeriods,
    minSwaps = 200
) {
    // default 24h
    let timeframe = "hour";
    let interval = 24;
    let from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if (timeperiod) {
        switch (timeperiod.toString().toLowerCase()) {
            case "5m":
                timeframe = "minute";
                interval = 5;
                from = new Date(Date.now() - 5 * 60 * 1000).toISOString();
                break;
            case "1h":
                timeframe = "hour";
                interval = 1;
                from = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                break;
            case "3h":
                timeframe = "hour";
                interval = 3;
                from = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
                break;
            case "12h":
                timeframe = "hour";
                interval = 12;
                from = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
                break;
            case "24h":
                timeframe = "hour";
                from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                break;
            case "7d":
                timeframe = "day";
                interval = 7;
                from = new Date(
                    Date.now() - 7 * 24 * 60 * 60 * 1000
                ).toISOString();
                break;
            case "30d":
                timeframe = "day";
                interval = 30;
                from = new Date(
                    Date.now() - 30 * 24 * 60 * 60 * 1000
                ).toISOString();
                break;
            case "1y":
                timeframe = "year";
                interval = 1;
                from = new Date(
                    Date.now() - 365 * 24 * 60 * 60 * 1000
                ).toISOString();
                break;
            case "3y":
                timeframe = "year";
                interval = 3;
                from = new Date(
                    Date.now() - 3 * 365 * 24 * 60 * 60 * 1000
                ).toISOString();
                break;
            case "5y":
                timeframe = "year";
                interval = 5;
                from = new Date(
                    Date.now() - 5 * 365 * 24 * 60 * 60 * 1000
                ).toISOString();
                break;
        }
    }

    const quotecurrencies = ChainQuoteCurrencies.get(chain)!;
    const dexProtocols = ChainDexProtocols.get(chain)!.map((p) => p.address);

    if (chain === 1 || chain === 56) {
        const variables = {
            network: chainMapBitqueryV1.get(chain.toString())!,
            limit: limit,
            from: from,
            till: new Date(Date.now()).toISOString(),
            quoteCurrencies: quotecurrencies,
            exchangeAddresses: dexProtocols,
        };

        // console.log('params', variables)
        // console.log("-------------")
        // exchangeAddress: {is: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"}   // only pancakeswap

        // options: {limitBy: {each: "baseCurrency.address", limit: 1}, desc: ["block.timestamp.time", "tradeIndex"]}    // limit by each base currency

        // timeInterval {
        //   ${timeframe}(count: ${interval})
        // }
        //    priceAsymmetry: {lt: 0.001}
        const payload = JSON.stringify({
            query: `
    query ($network: EthereumNetwork!, $limit: Int, $from: ISO8601DateTime, $till: ISO8601DateTime, $quoteCurrencies: [String!], $exchangeAddresses: [String!]) {
      ethereum(network: $network) {
        dexTrades(
         quoteCurrency: {in: $quoteCurrencies}
          time: {since: $from, till: $till}
          options: {limit: $limit, asc: "final", limitBy: {each: "baseCurrency.address, quoteCurrency.address", limit: 1}}
          exchangeAddress: {in: $exchangeAddresses}
        ) {
          baseCurrency {
            symbol
            name
            decimals
            address
          }
          quoteCurrency {
            name
            address
          }
          open_price: minimum(of: block, get: quote_price)
          close_price: maximum(of: block, get: quote_price)
          open_price_time: minimum(of: block, get: time)
          close_price_time: maximum(of: block, get: time)
          diff: expression(get: "close_price - open_price")
          div: expression(get: "diff / open_price")
          final: expression(get: "div * 100")
          count
          tradeAmount(in: USD)
          quotePrice
          quoteAmount
          volume: quoteAmount(in: USD)
        }
      }
    }
          `,
            variables,
        });
        const data = await fetchBitquery(
            runtime,
            BitqueryAPIVersion.v1,
            payload,
            "TOP LOOSER"
        );

        if (data && data?.data?.ethereum?.dexTrades) {
            const filteredTrades = data?.data?.ethereum?.dexTrades?.filter(
                (t: any) =>
                    t.count > minSwaps &&
                    t?.baseCurrency?.address?.length === 42 &&
                    !t?.baseCurrency?.name?.includes("Error")
            );
            const nativeCoinPriceData = await getTokenPricesBitqueryNew(
                runtime,
                chain,
                [WrappedNativeCoinOfChain.get(chain)?.address!],
                true
            );
            const res = filteredTrades
                ?.map((c: any) => {
                    const nativeCoinPriceOfChain = new BigNumber(
                        nativeCoinPriceData?.[0]?.usd
                    );
                    const nativPrice =
                        WrappedNativeCoinOfChain.get(
                            chain
                        )?.address!.toLowerCase() ===
                        c?.baseCurrency?.address?.toLowerCase()
                            ? new BigNumber(1)
                            : new BigNumber(+c?.close_price);
                    const priceUSD = nativPrice.times(nativeCoinPriceOfChain);
                    return {
                        symbol: c?.baseCurrency?.symbol,
                        address: c?.baseCurrency?.address,
                        decimals: c?.baseCurrency?.decimals,
                        name: c?.baseCurrency?.name,
                        change: cutToDigits(c?.final, 2),
                        priceType:
                            `${c?.final}`.substring(0, 1) === "-" ? "-" : "+",
                        volume: c?.volume,
                        price: priceUSD?.toFixed(18),
                        nativePrice: +c?.close_price,
                        swaps: c?.count,
                        quoteCurrency: {
                            symbol: c?.quoteCurrency?.symbol,
                            address: c?.quoteCurrency?.address,
                        },
                    };
                })
                // .filter((value: any, index: any, array: any[]) => array.indexOf(value) === index) // filter for unique values
                .filter(
                    (pd: any) =>
                        pd?.symbol &&
                        pd?.address &&
                        pd?.symbol !== "" &&
                        pd?.name !== ""
                ) as TopPairResponse; // filter out undefined values
            return res;
        }
    } else {
        const variables = {
            network: chainMapBitqueryV2.get(chain.toString())!,
            limit: limit,
            from: from,
            till: new Date(Date.now()).toISOString(),
            quoteCurrencies: quotecurrencies,
            exchangeAddresses: dexProtocols,
        };

        const payload = JSON.stringify({
            query: `query ($network: evm_network, $limit: Int, $from: DateTime, $till: DateTime, $quoteCurrencies: [String!], $exchangeAddresses: [String!]) {
                EVM(dataset: combined, network: $network) {
                  DEXTradeByTokens(
                    orderBy: {descendingByField: "volume"}
                    limit: {count: $limit}
                    limitBy: {by: [Trade_Currency_SmartContract], count: 1}
                    where: {Trade: {Side: {Currency: {SmartContract: {in: $quoteCurrencies}, Symbol: {}}}, Price: {gt: 0}, Dex: {OwnerAddress: {in: $exchangeAddresses}}, Currency: {Symbol: {notLike: ""}}}, Block: {Time: {since: $from, till: $till}}}
                  ) {
                    volume: sum(of: Trade_AmountInUSD)
                    count
                    Trade {
                      Dex {
                        OwnerAddress
                        ProtocolName
                      }
                      open: PriceInUSD(minimum: Block_Number)
                      close: PriceInUSD(maximum: Block_Number)
                      Side {
                        Currency {
                          Symbol
                          SmartContract
                        }
                      }
                      Currency {
                        Symbol
                        SmartContract
                        Decimals
                        Name
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
            payload
        );
        // console.log('top pairs loaded: ', data?.data?.ethereum?.dexTrades.length)

        if (data && data?.data?.EVM?.DEXTradeByTokens) {
            console.log(
                "FETCHED TOP LOSERS:",
                data?.data?.EVM?.DEXTradeByTokens?.length
            );
            const filteredTrades = data?.data?.EVM?.DEXTradeByTokens?.filter(
                (t: any) => t.count > minSwaps
            );
            // console.log(filteredTrades?.length)
            return (
                filteredTrades
                    ?.map((c: any) => {
                        return {
                            symbol: c?.Trade?.Currency?.Symbol,
                            address: c?.Trade?.Currency?.SmartContract,
                            decimals: c?.Trade?.Currency?.Decimals,
                            name: c?.Trade?.Currency?.Name,
                            change: calcPercentage(
                                c?.Trade?.open,
                                c?.Trade?.close
                            ), // cutToDigits(c?.final, 2),
                            priceType:
                                `${calcPercentage(c?.Trade?.open, c?.Trade?.close)}`.substring(
                                    0,
                                    1
                                ) === "-"
                                    ? "-"
                                    : "+", // c?.final
                            volume: c?.volume,
                            nativePrice: null, // +c?.close_price, // native price
                            price: +c?.Trade?.close, // price in USD
                            swaps: c?.count,
                            quoteCurrency: {
                                symbol: c?.Trade?.Side?.Currency?.Symbol,
                                address:
                                    c?.Trade?.Side?.Currency?.SmartContract,
                            },
                            protocol: c?.Trade?.Dex?.OwnerAddress,
                            protocolType: c?.Trade?.Dex?.ProtocolName,
                        };
                    })
                    // .filter((value: any, index: any, array: any[]) => array.indexOf(value) === index) // filter for unique values
                    .filter(
                        (pd: any) =>
                            pd?.symbol &&
                            pd?.address &&
                            pd?.symbol !== "" &&
                            pd?.name !== ""
                    ) // filter out undefined values
                    .sort(
                        (a: any, b: any) => Number(a.change) - Number(b.change)
                    ) as TopPairResponse
            );
        }
    }
    return null;
}

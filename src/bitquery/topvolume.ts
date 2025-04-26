import { TimePeriods } from "./types/timeperiods";
import { cutToDigits } from "./utils/cuttodigits";
import { TopPairResponse } from "./types/toppairs";
import { BitqueryAPIVersion, fetchBitquery } from "./utils/client";

import { chainMapBitqueryV2 } from "./config/chainmap";
import {
    ChainDexProtocols,
    ChainQuoteCurrencies,
} from "./config/chainaddresses";
import { IAgentRuntime } from "@elizaos/core";
import { getTotalSupply, getWeb3TotalSupply } from "./totalsupply";
import BigNumber from "bignumber.js";

function calcPercentage(startprice: number, endprice: number) {
    const percent = ((endprice - startprice) / startprice) * 100;

    if (!isNaN(percent)) {
        return percent.toFixed(2);
    } else {
        return null;
    }
}

export async function getTopPairsByVolBitquery(
    runtime: IAgentRuntime,
    chain: number,
    limit: number,
    timeperiod?: TimePeriods,
    minSwaps = 400
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

    // console.log('params', variables)
    // console.log("-------------")
    // exchangeAddress: {is: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"}   // only pancakeswap
    // options: {limitBy: {each: "baseCurrency.address", limit: 1}, desc: ["block.timestamp.time", "tradeIndex"]}    // limit by each base currency

    // BITQUERY SUPPORT TEAM RESPONSE:
    // FILTERING -> Count needs to be at least above ca 100 to be reliable (to have enough swaps...)
    // Following fields change the result and maybe need to be excluded and fetched seperately:
    // protocol
    // exchange {
    //   address {
    //     address
    //   }
    //   name
    // }

    //    priceAsymmetry: {lt: 0.001}  _> reliable change value but distort volume value

    // Distort volume and change value:
    // timeInterval {
    //  ${timeframe}(count: ${interval})
    //}
    // priceAsymmetry: {lt: 0.001}

    const variables = {
        network: chainMapBitqueryV2.get(chain.toString())!,
        limit: limit,
        from: from,
        till: new Date(Date.now()).toISOString(),
        quoteCurrencies: quotecurrencies,
        exchangeAddresses: dexProtocols,
    };
    // console.log(variables);
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

    const data = await fetchBitquery(runtime, BitqueryAPIVersion.v2, payload);
    // console.log('top pairs loaded: ', data?.data?.ethereum?.dexTrades.length)

    if (data && data?.data?.EVM?.DEXTradeByTokens) {
        console.log(
            "FETCHED TOP VOL PAIRS:",
            data?.data?.EVM?.DEXTradeByTokens?.length
        );
        const filteredTrades = data?.data?.EVM?.DEXTradeByTokens?.filter(
            (t: any) => t.count > minSwaps
        );
        const result = (await Promise.all(
            filteredTrades?.map(async (c: any) => {
                let totalSupply = null;
                if (
                    process.env.INFURA_API_KEY ||
                    runtime?.character?.settings?.secrets?.["INFURA_API_KEY"]
                ) {
                    try {
                        totalSupply = await getWeb3TotalSupply(
                            runtime,
                            chain,
                            c?.Trade?.Currency?.SmartContract
                        );
                    } catch (e) {
                        console.log(e);
                    }
                }

                return {
                    symbol: c?.Trade?.Currency?.Symbol,
                    address: c?.Trade?.Currency?.SmartContract,
                    decimals: c?.Trade?.Currency?.Decimals,
                    name: c?.Trade?.Currency?.Name,
                    change: calcPercentage(c?.Trade?.open, c?.Trade?.close), // cutToDigits(c?.final, 2),
                    priceType:
                        `${calcPercentage(c?.Trade?.open, c?.Trade?.close)}`.substring(
                            0,
                            1
                        ) === "-"
                            ? "-"
                            : "+", // c?.final
                    volume: c?.volume,
                    nativePrice: null, //  +c?.close_price, // native price
                    price: +c?.Trade?.close, // price in USD
                    marketCap: totalSupply
                        ? new BigNumber(c?.Trade?.close)
                              .times(new BigNumber(totalSupply))
                              .toFixed(0)
                        : null,
                    totalSupply: totalSupply
                        ? new BigNumber(totalSupply).toFixed(0)
                        : null,
                    swaps: c?.count,
                    quoteCurrency: {
                        symbol: c?.Trade?.Side?.Currency?.Symbol,
                        address: c?.Trade?.Side?.Currency?.SmartContract,
                    },
                    protocol: c?.Trade?.Dex?.OwnerAddress,
                    protocolType: c?.Trade?.Dex?.ProtocolName,
                };
            })
        )) as TopPairResponse;
        // .filter((value: any, index: any, array: any[]) => array.indexOf(value) === index) // filter for unique values // filter out undefined values
        return result;
    }
    return null;
}

// original query
//   query ($network: EthereumNetwork!, $limit: Int!, $offset: Int!, $from: ISO8601DateTime, $till: ISO8601DateTime) {
//     ethereum(network: $network) {
//       dexTrades(
//         options: {desc: "tradeAmount", limit: $limit, offset: $offset}
//         date: {since: $from, till: $till}
//         exchangeName: {is: "PancakeSwap"}
//       ) {
//         buyCurrency {
//           symbol
//           address
//           decimals
//           name
//         }
//         sellCurrency {
//           symbol
//           address
//         }
//         count
//         tradeAmount(in: USD)
//         exchange {
//           fullName
//         }
//       }
//     }
//   }

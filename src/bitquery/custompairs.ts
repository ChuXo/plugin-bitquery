import { TimePeriods } from "./types/timeperiods";
import { BitqueryAPIVersion, fetchBitquery } from "./utils/client";

import { CustomPairResponse } from "./types/custompairs";
import { chainMapBitqueryV2 } from "./config/chainmap";
import {
    ChainDexProtocols,
    ChainQuoteCurrencies,
} from "./config/chainaddresses";
import { IAgentRuntime } from "@elizaos/core";

function calcPercentage(startprice: number, endprice: number) {
    const percent = ((endprice - startprice) / startprice) * 100;

    if (!isNaN(percent)) {
        return percent.toFixed(2);
    } else {
        return null;
    }
}

export async function getCustomPairsBitquery(
    runtime: IAgentRuntime,
    chain: number,
    limit: number,
    timeperiod?: TimePeriods,
    minSwaps = 400,
    minPrice?: number,
    maxPrice?: number,
    minVolume?: number,
    maxVolume?: number,
    startsWith?: string,
    selectedDex?: string
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

    const singleDexProtocol = selectedDex
        ? ChainDexProtocols.get(chain)!.find(
              (dex: { name: string; address: string }) =>
                  dex.name.toLowerCase() === selectedDex.toLowerCase()
          )?.address
        : undefined;
    const dexProtocols = singleDexProtocol
        ? [singleDexProtocol]
        : ChainDexProtocols.get(chain)!.map((p) => p.address);

    const variables = {
        network: chainMapBitqueryV2.get(chain.toString())!,
        limit: limit,
        from: from,
        till: new Date(Date.now()).toISOString(),
        quoteCurrencies: quotecurrencies,
        exchangeAddresses: dexProtocols,
    };

    console.log("params", variables);
    // console.log("-------------")
    // exchangeAddress: {is: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"}   // only pancakeswap

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

    // Distort volume and change value
    // timeInterval {
    //  ${timeframe}(count: ${interval})
    //}
    //        priceAsymmetry: {lt: 0.001}

    const priceOption =
        minPrice && maxPrice
            ? `PriceInUSD: {gt: ${minPrice}, lt: ${maxPrice}},`
            : minPrice
              ? `PriceInUSD: {gt: ${minPrice}},`
              : maxPrice
                ? `PriceInUSD: {lt: ${maxPrice}},`
                : "PriceInUSD: {},";
    const startWithOption = startsWith ? startsWith : "";

    const volumeOption =
        minVolume && maxVolume
            ? `volume: sum(of: Trade_AmountInUSD selectWhere:{gt:"${minVolume}" le:"${maxVolume}"})`
            : minVolume
              ? `volume: sum(of: Trade_AmountInUSD selectWhere:{gt:"${minVolume}"})`
              : maxVolume
                ? `volume: sum(of: Trade_AmountInUSD selectWhere:{le:"${maxVolume}"})`
                : "volume: sum(of: Trade_AmountInUSD)";

    const payload = JSON.stringify({
        query: `
    query ($network: evm_network, $limit: Int, $from: DateTime, $till: DateTime, $quoteCurrencies: [String!], $exchangeAddresses: [String!]) {
      EVM(network: $network, dataset: combined) {
        DEXTradeByTokens(
          orderBy: {descendingByField: "volume"}
          limit: {count: $limit}
          limitBy: {by: [Trade_Currency_SmartContract], count: 1}
          where: {Trade: {Side: {Currency: {SmartContract: {in: $quoteCurrencies}, Symbol: {}}}, Price: {gt: 0}, Dex: {OwnerAddress: {in: $exchangeAddresses}}, ${priceOption} Currency: {Name: {startsWith: "${startWithOption}"}, Symbol: {notLike: ""}}}, Block: {Time: {since: $from, till: $till}}}
        ) {
          ${volumeOption}
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

    // wethPriceInUSD: expression(get: "volume / quoteAmount")
    // closeUSD: expression(get: "wethPriceInUSD * close_price")

    const data = await fetchBitquery(runtime, BitqueryAPIVersion.v2, payload);

    if (data && data?.data?.EVM?.DEXTradeByTokens) {
        console.log(
            "FETCHED CUSTOM PAIRS:",
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
                        change: calcPercentage(c?.Trade?.open, c?.Trade?.close), // cutToDigits(c?.final, 2),
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
                            address: c?.Trade?.Side?.Currency?.SmartContract,
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
                ) as CustomPairResponse
        ); // filter out undefined values
    }
    return null;
}

// close2: PriceInUSD(
//   minimum: Block_Time
//   if: {Block: {Time: {after: "2024-06-10T05:20:30Z"}}}
// )

// original query
// query ($network: evm_network, $limit: Int, $from: DateTime, $till: DateTime, $quoteCurrencies: [String!], $exchangeAddresses: [String!]) {
//   EVM(network: $network, dataset: combined) {
//     DEXTradeByTokens(
//     	orderBy: {descendingByField: "volume"}
//       limit: {count: $limit}
//       limitBy: {by: [Trade_Currency_SmartContract], count: 1}
//       where: {Trade: {Side: {Currency: {SmartContract: {in: $quoteCurrencies}, Symbol: {}}}, Price: {gt: 0}, Dex: {OwnerAddress: {in: $exchangeAddresses}}, PriceInUSD: {gt: 0, lt: 4000}, Currency: {Name: {startsWith: ""}, Symbol: {notLike: ""}}}, Block: {Time: {since: $from, till: $till}}}
//     ) {
//       volume: sum(of: Trade_Side_AmountInUSD)
// 			count
//       Trade {
//         Dex {
//         	OwnerAddress
//         }
//         open: PriceInUSD(minimum: Block_Number)
//         close: PriceInUSD(maximum: Block_Number)
//         close2: PriceInUSD(
//           minimum: Block_Time
//           if: {Block: {Time: {after: "2024-06-10T05:20:30Z"}}}
//         )
//         Side {
//           Currency {
//             Symbol
//             SmartContract
//           }
//         }
//         Currency {
//           Symbol
//           SmartContract
//           Decimals
//         }
//       }
//     }
//   }
// }

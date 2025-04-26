import { WrappedNativeCoinOfChain } from "./config/chainaddresses";
import { chainMapBitqueryV1 } from "./config/chainmap";
import { BitqueryAPIVersion, fetchBitquery } from "./utils/client";

export type LPPools = LP[];
export interface LP {
    baseCurrency: string;
    quoteCurrency: string;
    quoteSymbol: string;
    baseSymbol: string;
    protocol: string;
    protocolType: string;
    exchange: string;
}

export interface LPVars {
    network: number;
    baseCurrency: string;
}

export async function getLiquidityPools(vars: LPVars) {
    // change native basecurrency to wrapped
    if (
        vars?.baseCurrency?.toLowerCase() ===
            "0x0000000000000000000000000000000000000000"?.toLowerCase() || // NativeCoin
        vars?.baseCurrency?.toLowerCase() ===
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"?.toLowerCase() // NativeCoin
    ) {
        vars.baseCurrency = WrappedNativeCoinOfChain.get(
            vars?.network
        )?.address!; // WBNB or WETH
    }

    //   const cachedLPpools = lpPoolCache?.get(vars?.baseCurrency)
    //   if (cachedLPpools){
    //     return cachedLPpools
    //   }

    const variables = {
        limit: 6,
        offset: 0,
        network: chainMapBitqueryV1.get(vars?.network?.toString()),
        baseCurrency: vars?.baseCurrency,
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        till: new Date(Date.now()).toISOString(), //
        dateFormat: "%Y-%m-%d",
    };

    const payload = JSON.stringify({
        query: `
      query getLiquidityPools($network: EthereumNetwork!, $from: ISO8601DateTime, $till: ISO8601DateTime, $baseCurrency: String, $limit: Int!, $offset: Int!) {
        ethereum(network: $network) {
          dexTrades(
            baseCurrency: {is: $baseCurrency}
            date: {since: $from, till: $till}
            options: {desc: "count", limit: $limit, offset: $offset}
          ) {
            quoteCurrency {
              symbol
              name
              address
            }
            baseCurrency {
              symbol
            }
            count
            protocol
            exchange {
              address {
                address
              }
              name
            }
          }
        }
      }
      `,
        variables, // needs to be called "variables"
    });
    const data = await fetchBitquery(BitqueryAPIVersion.v1, payload);

    if (data && data?.data?.ethereum?.dexTrades) {
        const pools = data?.data?.ethereum?.dexTrades?.map((pool: any) => {
            return {
                quoteCurrency: pool?.quoteCurrency?.address,
                quoteSymbol: pool?.quoteCurrency?.symbol,
                baseCurrency: variables?.baseCurrency,
                baseSymbol: pool?.baseCurrency?.symbol,
                exchange: pool?.exchange?.name,
                protocol: pool?.exchange?.address?.address,
                protocolType: pool?.protocol,
            };
        }) as LPPools;

        //   // add some fallback pools
        //   pools.push({
        //     quoteCurrency: stableCoinsOfChain.get(vars?.network === 'bsc' ? 56 : 1)?.[0]!,
        //     quoteSymbol: "USDT",
        //     baseCurrency: variables?.baseCurrency,
        //     baseSymbol: pools?.[0]?.baseSymbol
        //   })
        //   pools.push({
        //     quoteCurrency: stableCoinsOfChain.get(vars?.network === 'bsc' ? 56 : 1)?.[1]!,
        //     quoteSymbol: vars?.network === 'bsc' ? "BUSD" : "USDC",
        //     baseCurrency: variables?.baseCurrency,
        //     baseSymbol: pools?.[0]?.baseSymbol
        //   })
        //   pools.push({
        //     quoteCurrency: stableCoinsOfChain.get(vars?.network === 'bsc' ? 56 : 1)?.[2]!,
        //     quoteSymbol: vars?.network === 'bsc' ? "USDC" : "DAI",
        //     baseCurrency: variables?.baseCurrency,
        //     baseSymbol: pools?.[0]?.baseSymbol
        //   })

        // -------------------------------------
        // special case for ETH (wormhole) because highest liq pair is ETH/WETH, remove it to use 2. pair (ETH/USDT) (except for BNB)
        // general rule: if Symbol is equal or included both base/quote symbol, throw out pair
        const indexesToRemove: number[] = [];
        pools.forEach((p, i) => {
            if (
                p?.quoteSymbol.includes(p?.baseSymbol) ||
                p?.baseSymbol.includes(p?.quoteSymbol)
            ) {
                if (
                    !p?.quoteSymbol.includes("WBNB") &&
                    !p?.baseSymbol.includes("WBNB")
                ) {
                    // dont do it for WBNB, BNB
                    indexesToRemove.push(i);
                }
            }
        });
        indexesToRemove.forEach((index) => {
            pools.splice(index, 1);
        });
        // ----------------------------------------

        // console.log("get lp called", pools)
        // console.log("pools", pools)
        //   lpPoolCache.set(variables.baseCurrency, pools)
        return pools as LPPools;
    }
}

export async function getTokenCandles(address: string) {
    const pools = await getLiquidityPools({
        network: 56,
        baseCurrency: address,
    });
    if (!pools) return null;
    // console.log("pool found", pools?.[0])

    const quoteCurrency = pools?.[0]?.quoteCurrency;
    if (!quoteCurrency) return null;

    const timeframe = "minutes";

    const variables = {
        network: "bsc",
        interval: 1,
        limit: 2000,
        timeframe,
        from: new Date(
            new Date().setDate(new Date().getDate() - 160)
        ).toISOString(),
        till: new Date(new Date().setDate(new Date().getDate())).toISOString(),
        baseCurrency: address,
        quoteCurrency: quoteCurrency as string,
    };

    // console.log("params", variables )
    // console.log("-------------")
    //               where: {Trade: {Side: {Currency: {SmartContract: {is: $baseCurrency}, Symbol: {}}}, Currency: {SmartContract: {is: $quoteCurrency}, Symbol: {}}, Price: {gt: 0${maxPriceForStrx}}, Dex: {OwnerAddress: {is: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"}}, Success: true, Amount: {gt: "0.000000000000000001"}}, Block: {Time: {since: $from, till: $till}}}

    const sort = "descendingByField";
    const maxPriceForStrx =
        variables.baseCurrency.toLowerCase() ===
        "0xd6fDDe76B8C1C45B33790cc8751D5b88984c44ec".toLowerCase()
            ? ", lt: 1.5"
            : "";
    const payload = JSON.stringify({
        query: `
      query ($network: evm_network, $interval: Int, $limit: Int, $timeframe: OLAP_DateTimeIntervalUnits, $from: DateTime, $till: DateTime, $baseCurrency: String, $quoteCurrency: String) {
        EVM(network: $network, dataset: combined) {
          DEXTradeByTokens(
            orderBy: {${sort}: "Block_Time"}
            limit: {count: $limit}
            where: {Trade: {Side: {Currency: {SmartContract: {is: $quoteCurrency}, Symbol: {}}}, Currency: {SmartContract: {is: $baseCurrency}, Symbol: {}}, Price: {gt: 0${maxPriceForStrx}}, Success: true, Amount: {gt: "0.000000000000000001"}}, Block: {Time: {since: $from, till: $till}}}
          ) {
            ChainId
            Block {
              Time(interval: {in: $timeframe, count: $interval})
            }
            volume: sum(of: Trade_Amount)
            Trade {
              high: Price(maximum: Trade_Price)
              low: Price(minimum: Trade_Price)
              open: Price(minimum: Block_Number)
              close: Price(maximum: Block_Number)
              Side {
                Currency {
                  Symbol
                }
              }
              Currency {
                Symbol
              }
            }
            count
          }
        }
      }
          `,
        variables,
    });
    const data = await fetchBitquery(
        BitqueryAPIVersion.v2,
        payload,
        "GET LIQUIDITY POOLS"
    );

    if (data && data?.data?.EVM?.DEXTradeByTokens) {
        return data?.data?.EVM?.DEXTradeByTokens;
    }
    return null;
}

import { IAgentRuntime } from "@elizaos/core";
import { chainMapBitqueryV2 } from "./config/chainmap";
import { BitqueryAPIVersion, fetchBitquery } from "./utils/client";
import { camelizeKeys } from "./utils/camelizeKeys";

interface BitqueryResponse {
    Block: {
        Number: string;
        Time: string;
    };
    Trade: {
        Buy: {
            Amount: string;
            Buyer: string;
            Currency: {
                Name: string;
                ProtocolName?: string; // optional as some might not have it
                SmartContract: string;
                Symbol: string;
            };
            Price: number;
            PriceInUSD: number;
            AmountInUSD: string;
            Seller: string;
        };
        Sell: {
            Amount: string;
            Currency: {
                Name: string;
                ProtocolName?: string; // optional as some might not have it
                SmartContract: string;
                Symbol: string;
            };
            Price: number;
            PriceInUSD: number;
            AmountInUSD: string;
            Seller: string;
        };
    };
    Transaction: {
        From: string;
        Hash: string;
        To: string;
    };
}

type BitqueryResponseArray = BitqueryResponse[];

function isBitqueryResponse(
    trade: Record<string, unknown>
): trade is Record<string, unknown> & BitqueryResponse {
    return (
        trade &&
        typeof trade === "object" &&
        "Block" in trade &&
        "Trade" in trade &&
        "Transaction" in trade
    );
}

export async function getWalletDexTradesBitquery(
    runtime: IAgentRuntime,
    chain: number,
    address: string
): Promise<BitqueryResponseArray | null> {
    const variables = {
        address,
        network: chainMapBitqueryV2.get(chain.toString())!,
    };

    const payload = JSON.stringify({
        query: `
      query EVMQuery($address: String, $network: evm_network) {
        EVM(dataset: combined, network: $network) {
          DEXTrades(
            limit: {count: 10}
            orderBy: {descending: Block_Time}
            where: {any: [{Trade: {Buy: {Buyer: {is: $address}}}}, {Trade: {Buy: {Seller: {is: $address}}}}, {Transaction: {From: {is: $address}}}, {Transaction: {To: {is: $address}}}]}
          ) {
            Block {
              Number
              Time
            }
            Transaction {
              From
              To
              Hash
            }
            Trade {
              Buy {
                Amount
                Buyer
                Currency {
                  Name
                  Symbol
                  SmartContract
                  ProtocolName
                }
                Seller
                Price
                PriceInUSD
                AmountInUSD
              }
              Sell {
                Amount
                Currency {
                  Name
                  SmartContract
                  Symbol
                }
                Seller
                Price
                PriceInUSD
                AmountInUSD
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
        "getWalletDexTradesBitquery"
    );

    if (data && data?.data?.EVM?.DEXTrades) {
        const results: BitqueryResponseArray = [];
        data.data.EVM.DEXTrades.forEach((trade: Record<string, unknown>) => {
            const camelizedTrade = camelizeKeys(trade);
            if (Array.isArray(camelizedTrade)) {
                // Handle the case where camelizedTrade is an array
                camelizedTrade.forEach((tradeObject) => {
                    if (isBitqueryResponse(tradeObject)) {
                        results.push(tradeObject);
                    }
                });
            } else {
                // Handle the case where camelizedTrade is a single object
                if (isBitqueryResponse(camelizedTrade)) {
                    results.push(camelizedTrade);
                }
            }
        });
        return results;
    }
    return null;
}

export async function getAssetDexTradesBitquery(
    runtime: IAgentRuntime,
    chain: number,
    address: string
) {
    const network = chainMapBitqueryV2.get(chain.toString())!;
    const variables = {
        network: network,
        token: address,
        limit: 100,
        offset: 0,
    };
    const payload = JSON.stringify({
        query: `
    query LastAssetTxns($network: evm_network!, $token: String!, $limit: Int!, $offset: Int!) {
      EVM(dataset: realtime, network: $network) {
        buyside: DEXTrades(
          limit: { count: $limit, offset: $offset }
          orderBy: { descending: Block_Time }
          where: { Trade: { Success: true, Sell: { Currency: { SmartContract: { is: $token } } } } }
        ) {
          Block {
            Time
          }
          Transaction {
            Hash
            From
          }
          Trade {
            Buy {
              Amount
              Currency {
                Symbol
                SmartContract
              }
              Price
              PriceInUSD
            }
            Sell {
              Amount
              Currency {
                Symbol
                SmartContract
              }
              Price
              PriceInUSD
            }
          }
        }
        sellside: DEXTrades(
          limit: { count: $limit, offset: $offset }
          orderBy: { descending: Block_Time }
          where: { Trade: { Success: true, Buy: { Currency: { SmartContract: { is: $token } } } } }
        ) {
          Block {
            Time
          }
          Transaction {
            Hash
            From
          }
          Trade {
            Buy {
              Amount
              Currency {
                Symbol
                SmartContract
              }
              Price
              PriceInUSD
            }
            Sell {
              Amount
              Currency {
                Symbol
                SmartContract
              }
              Price
              PriceInUSD
            }
          }
        }
      }
    }
    `,
        variables,
    });
    const data = await fetchBitquery(runtime, BitqueryAPIVersion.v2, payload);
    return data;
}

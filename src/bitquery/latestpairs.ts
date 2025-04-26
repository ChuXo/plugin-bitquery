import { IAgentRuntime } from "@elizaos/core";
import {
    ChainDexProtocols,
    ChainQuoteCurrencies,
    NativeCoinOfChain,
    StableCoinsOfChain,
} from "./config/chainaddresses";
import { chainMapBitqueryV2 } from "./config/chainmap";
import { BitqueryAPIVersion, fetchBitquery } from "./utils/client";
import { getPairsBitquery } from "./pairs";
import { TopPairResponse } from "./types/toppairs";
import { TimePeriods } from "./types/timeperiods";

// Enhanced function to include "created" field in the response
export async function getLatestPairsBitqueryNew(
    runtime: IAgentRuntime,
    chain: number,
    timeperiod: TimePeriods,
    limit: number
): Promise<TopPairResponse> {
    const network = chainMapBitqueryV2.get(chain.toString() as string);
    const dexProtocols = ChainDexProtocols.get(chain)!.map((p) => p.address);
    const quoteCurrencies = ChainQuoteCurrencies.get(chain);
    const variables = {
        network: network,
        limit: limit,
        dexProtocols: dexProtocols,
    };
    //   where: {Log: {SmartContract: {in: ["0x1f98431c8ad98523631ae4a59f267346ea31f984"]}, Signature: {Name: {is: "PoolCreated"}}}}
    const payload = JSON.stringify({
        query: `
      query ($network: evm_network, $dexProtocols: [String!], $limit: Int) {
  EVM(dataset: realtime, network: $network) {
    Events(
      orderBy: {descending: Block_Number}
      limit: {count: $limit}
      where: {Log: {SmartContract: {in: $dexProtocols}, Signature: {Name: {is: "PoolCreated"}}}}
    ) {
      Log {
        Signature {
          Name
          Parsed
          Signature
        }
        SmartContract
      }
      Transaction {
        Hash
      }
      Block {
        Time
        Number
      }
      Arguments {
        Name
        Value {
          __typename
          ... on EVM_ABI_Integer_Value_Arg {
            integer
          }
          ... on EVM_ABI_String_Value_Arg {
            string
          }
          ... on EVM_ABI_Address_Value_Arg {
            address
          }
          ... on EVM_ABI_BigInt_Value_Arg {
            bigInteger
          }
          ... on EVM_ABI_Bytes_Value_Arg {
            hex
          }
          ... on EVM_ABI_Boolean_Value_Arg {
            bool
          }
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
        "getLatestPairsBitqueryNew"
    );

    if (!data || !data?.data?.EVM || !data?.data?.EVM.Events) {
        return [];
    }

    const addressesWithDates = new Map<string, string>();

    data?.data.EVM.Events.forEach((event) => {
        const blockTime = event.Block.Time; // Extract block time as datetime string
        let includeEvent = false; // Track if the event matches the condition
        const tokenAddresses = [];

        event.Arguments.forEach((arg) => {
            if (
                (arg.Name === "token0" || arg.Name === "token1") &&
                arg.Value.__typename === "EVM_ABI_Address_Value_Arg"
            ) {
                const address = arg.Value.address.toLowerCase();
                tokenAddresses.push(address);
                if (quoteCurrencies?.includes(address)) {
                    includeEvent = true; // Match found
                }
            }
        });

        // Only include the event if it matches the condition
        if (includeEvent) {
            tokenAddresses.forEach((address) => {
                addressesWithDates.set(address, blockTime);
            });
        }
    });

    const latestTokens = Array.from(addressesWithDates.keys()).filter(
        (address) =>
            address.toLowerCase() !==
                NativeCoinOfChain.get(chain).address.toLowerCase() &&
            address.toLowerCase() !==
                StableCoinsOfChain.get(chain)?.[0]?.address.toLowerCase()
    );

    const pairs = await getPairsBitquery(
        runtime,
        chain,
        latestTokens,
        limit,
        timeperiod,
        0
    );

    // Enhance the TopPairResponse with the "created" field
    const enhancedPairs: TopPairResponse = pairs.map((pair) => {
        return {
            ...pair,
            created: addressesWithDates.get(pair.address) || null, // Add the created field
        };
    });

    return enhancedPairs;
}

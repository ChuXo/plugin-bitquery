import { BitqueryAPIVersion, fetchBitquery } from "./utils/client";
import { getUnixTime, parseJSON } from "date-fns";
import { chainMapBitqueryV1 } from "./config/chainmap";
import { IAgentRuntime } from "@elizaos/core";

// bitquery v1
export async function getAge(
    runtime: IAgentRuntime,
    chain: number,
    address: string
) {
    if (!address && address.length !== 42) {
        return null;
    }
    const variables = {
        network: chainMapBitqueryV1.get(chain.toString()),
        baseCurrency: address,
    };

    const payload = JSON.stringify({
        query: `
          query getAge($network: EthereumNetwork!, $baseCurrency: String) {
            ethereum(network: $network) {
              dexTrades(baseCurrency: {is: $baseCurrency}) {
                minimum(of: block, get: time)
              }
              transfers(currency: {is: $baseCurrency}) {
                minimum(of: block, get: time)
              }
            }
          }
          `,
        variables,
    });
    const data = await fetchBitquery(runtime, BitqueryAPIVersion.v1, payload);

    if (data && data?.data?.ethereum?.dexTrades) {
        return getUnixTime(
            parseJSON(data?.data?.ethereum?.dexTrades?.[0]?.minimum)
        ); // transfers?.[0]?.minimum
    } else {
        return null;
    }
}

import { IAgentRuntime } from "@elizaos/core";
import { chainMapBitqueryV2 } from "./config/chainmap";
import { BitqueryAPIVersion, fetchBitquery } from "./utils/client";

// too slow for more tokens
export async function getTotalHolders(
    runtime: IAgentRuntime,
    chain: number,
    address: string
) {
    const variables = {
        network: chainMapBitqueryV2.get(chain.toString())!,
        date: new Date(Date.now()).toISOString(),
        baseCurrency: address,
    };
    // console.log(variables);
    const payload = JSON.stringify({
        query: ` query ($network: evm_network, $baseCurrency: String!, $date: String!) {
    EVM(dataset: archive, network: $network) {
      TokenHolders(
        date: $date
        tokenSmartContract: $baseCurrency
        where: { Balance: { Amount: { gt: "0" } } }
      ) {
        uniq(of: Holder_Address)
      }
    }
  }
}
            `,
        variables,
    });

    const data = await fetchBitquery(runtime, BitqueryAPIVersion.v2, payload);

    if (data && data?.data?.EVM?.TokenHolders) {
        return data?.data?.EVM?.TokenHolders?.[0]?.uniq;
    }
}

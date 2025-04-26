import { IAgentRuntime } from "@elizaos/core";
import { chainMapBitqueryV2 } from "./config/chainmap";
import { BitqueryAPIVersion, fetchBitquery } from "./utils/client";

export async function getWalletBalancesBitquery(
    runtime: IAgentRuntime,
    chain: number,
    address: string
) {
    const variables = {
        address,
        network: chainMapBitqueryV2.get(chain.toString())!,
    };

    const payload = JSON.stringify({
        query: `
    query EVMQuery($address: String, $network: evm_network) {
      EVM(dataset: combined, network: $network) {
        BalanceUpdates(
          where: {BalanceUpdate: {Address: {is: $address}}}
          orderBy: {descendingByField: "balance"}
        ) {
          Currency {
            Name
            SmartContract
            Symbol
          }
          balance: sum(of: BalanceUpdate_Amount, selectWhere: {gt: "0"})
          BalanceUpdate {
            Address
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
        "getWalletBalancesBitquery"
    );

    if (data && data?.data?.EVM?.BalanceUpdates) {
        return data?.data?.EVM?.BalanceUpdates.map((i: any) => {
            return {
                symbol: i?.Currency?.Symbol,
                address: i?.Currency?.SmartContract,
                name: i?.Currency?.Name,
                value: i?.balance,
            };
        });
    }
    return null;
}

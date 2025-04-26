import { IAgentRuntime } from "@elizaos/core";
import { chainMapBitqueryV2 } from "./config/chainmap";
import { BitqueryAPIVersion, fetchBitquery } from "./utils/client";
import { createPublicClient, formatEther, http } from "viem";
import { mainnet, base, bsc, arbitrum } from "viem/chains";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const ERC20 = require("@openzeppelin/contracts/build/contracts/ERC20.json");

export async function getWeb3TotalSupply(
    runtime: IAgentRuntime,
    chain: number,
    address: `0x${string}`
) {
    const infura_api_key =
        process.env.INFURA_API_KEY ||
        runtime?.character?.settings?.secrets?.["INFURA_API_KEY"];
    if (!infura_api_key || infura_api_key === "")
        throw new Error(
            "INFURA_API_KEY is not set in secrets or env variables"
        );
    const transportUrl =
        chain === 1
            ? "https://mainnet.infura.io/v3/"
            : chain === 56
              ? "" // no infura url currently provided
              : chain === 8453
                ? "https://base-mainnet.infura.io/v3/"
                : null;
    const viewmChain =
        chain === 1
            ? mainnet
            : chain === 56
              ? bsc
              : chain === 8354
                ? base
                : null;

    try {
        const publicClient = createPublicClient({
            chain: viewmChain,
            transport: http(transportUrl + infura_api_key),
        });
        const data = (await publicClient.readContract({
            address: address,
            abi: ERC20.abi,
            functionName: "totalSupply",
            args: [],
        })) as bigint;
        return formatEther(data);
    } catch (e) {
        console.log(e);
    }
}

// too slow and too expensive in terms of point usage
export async function getTotalSupply(
    runtime: IAgentRuntime,
    chain: number,
    tokenAddress: string
) {
    const payload = JSON.stringify({
        query: `
        query ($network: evm_network, $tokenAddress: String!) {
          EVM(network: $network, dataset: combined) {
            Transfers(
              where: {
                Transfer: {
                  Currency: { SmartContract: { is: $tokenAddress } }
                  Success: true
                }
              }
            ) {
              minted: sum(
                of: Transfer_Amount
                if: { Transfer: { Sender: { is: "0x0000000000000000000000000000000000000000" } } }
              )
              burned: sum(
                of: Transfer_Amount
                if: { Transfer: { Receiver: { is: "0x0000000000000000000000000000000000000000" } } }
              )
            }
          }
        }
        `,
        variables: {
            network: chainMapBitqueryV2.get(chain.toString())!,
            tokenAddress: tokenAddress,
        },
    });

    const data = await fetchBitquery(runtime, BitqueryAPIVersion.v2, payload);
    const transfers = data?.data?.EVM?.Transfers?.[0];

    if (transfers) {
        const totalSupply = transfers.minted - transfers.burned;
        return totalSupply > 0 ? totalSupply : 0;
    }
    return 0;
}

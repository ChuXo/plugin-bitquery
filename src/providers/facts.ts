import {
    embed,
    MemoryManager,
    formatMessages,
    AgentRuntime as IAgentRuntime,
} from "@elizaos/core";
import type { Memory, Provider, State } from "@elizaos/core";

export const factsProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        console.log("facts provider");
        return `The price or unit of acount doesn't matter, it's the tokenomics, market cap, hype potential and performance.
        People remember previous performance and will buy back on a dip in a bull market if they miss an narrativ.
        The fibonacci numbers play a key role in human psychology and market behavior.
        Low volume or only a few holders can indicate scams and rug pulls, but scammers are getting better in faking those stats, take this into consideration.
        Huge pumps are often followed by huge dumps. Especially pumps with millions of percentage gains are often fakes.
        Gainers, Losers and Top Volume Tokens of a timeperiod, typically 24h are the most interesting, especially the percentage gains.
        The wrapped native coin token of a chain (like WETH, WBTC...) has mostly the same usd price and change as the native coin itself, keep this in mind during a general market analyses.
        `;
    },
};

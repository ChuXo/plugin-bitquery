export const topvolumeParamTemplate = `Given the recent messages and information below:

{{recentMessages}}

Extract the following information about the requested on-chain data:
- Chains to execute on: Must be one or more of [8453, 1, 42161, 56]. The associated chain ids: for base: 8453, ethereum: 1, arbitrum: 42161, bsc: 56. Default is base [8354].
- Timeperiod of tokens to fetch: Must be one of ["1h", "3h", "24h", "7d", "30d", "1y"]. Default is "24h".
- Limit or amount of tokens to fetch: Must be a number, minimum 10 and maximum 1000. Default is 300.

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "chain": SupportedChains[] | null,
    "timeperiod": TimePeriods | null,
    "limit": number | null
}
\`\`\`
`;

export const topvolumeTemplate = `Given the recent messages and information below:

# recent messages:
{{recentMessages}}

# on-chain data:
{{onchainKnowledge}}

# Analysis:

- The on-chain data is a token list sorted by volume which means it's sorted by the top traded tokens (by volume) on that specific chain within the spesific timeperid (24h for example).
- Interesting are also those tokens, which have the highest positive price changes (top gainers) or negative price changes (top losers). So find them out and provide sorted lists (listings with line breaks for good overview) with short analysis or tips.
- Provide useful tips in your own words based on this lists, it might be good to take action on the top losers or gainers, wether to buy or sell.
- You only provide analysis based on the raw on-chain transactions, and on-chain data can be faked to promote scams which you can not identify, keep that in mind when providing analysis.
- Provide a clear and full summary or analysis of the on-chain data keeping all that in mind. Either provide a short summary (post) or a long analysis or list the raw data based on the request in the recent messages.

# Example top gainers post (use a strict 206 chars max limit, provide only valuable data like ticker, price change, volume or swaps):

'
📈 Top Gainers (24h) on Base Chain:

1. AiSTR: +34.91%, Vol: 2M$
2. CHAOS: +23.39%, Vol: 1M$
3. OM: +21.15%, Vol: 3M$
4. GPS: +14.63%, Vol: 1.5M$

Harness these insights for strategic foresight! 🚀
'

`;

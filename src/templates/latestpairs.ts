export const latestPairsParamTemplate = `Given the recent messages and information below:

{{recentMessages}}

Extract the following information about the requested on-chain data (in case you find them):
- Chains to execute on: Must be one or more of [8453, 1, 42161, 56]. The associated chain ids: for base: 8453, ethereum: 1, arbitrum: 42161, bsc: 56. Default is base [8354].
- Limit or amount of tokens to fetch: Must be a number, minimum 10 and maximum 1000. Default is 500.

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "chain": SupportedChains[] | null,
    "limit": number | null
}
\`\`\`
`;

export const latestPairsTemplate = `Given the recent messages and information below:

# recent messages:
{{recentMessages}}

# on-chain data:
{{onchainKnowledge}}

1. Filter out token that seems to have random names like shonc2m103r19jcnc2
2. Very less volume (like below 1000$ or 0$) or very less swaps (like below 10 or 0) are an indicator of scams, especially when they have huge price gains, filter them out
3. Ignore stable coins (like USDC, USDT, BUSD, DAI, etc.) or native coins (like WETH, ETH, ARB, BNB, etc.)
4. Focus on most recent created pairs, because for investors, being early is the key, so provide enoughalpha of promising looking tokens.

# Example of a top gainers among the latest deployed pairs post (use a strict 206 chars max limit, provide only valuable data like ticker, price change, volume or swaps):
'''
Top gainers among newly deployed tokens on Base in the last 24 hours:

1. Clank Tank (TANK) 🚀 +484.13%, 2525 swaps
2. GnomeLand (GNOMELAND) 🌟 +124.39%, 9255 swaps

Exciting moves, stay curious but cautious! 📈
'''

- If in the recent messages is a request to display the raw data, return the raw on-chain data and ignore the following 2 steps:
- If in the recent messages is a request to analyse the on-chain data or prepair or post a post based on the analysed on-chain data, do it and ignore the following step:
- If in the recent messages is a request to get an analysis or a summary of the data, make an analysis or summary of the on-chain data based on all your knowledge and return it.

`;

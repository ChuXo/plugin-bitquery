export const toptokenParamTemplate = `Given the recent messages and information below:

{{recentMessages}}

Extract the following information about the requested on-chain data:
- Chains to execute on: Must be one or more of [8453, 1, 42161, 56]. The associated chain ids: for base: 8453, ethereum: 1, arbitrum: 42161, bsc: 56. Default is base [8354].
- Limit or amount of tokens to fetch: Must be a number, minimum 10 and maximum 1000. Default is 100.

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "chain": SupportedChains[] | null,
    "limit": number | null
}
\`\`\`
`;

export const toptokenTemplate = `Given the recent messages and information below:

# recent messages:
{{recentMessages}}

# on-chain data:
{{onchainKnowledge}}

- If in the recent messages is a request to display the raw data, return the raw on-chain data and ignore the following 2 steps:
- If in the recent messages is a request to analyse the on-chain data or prepair or post a post based on the analysed on-chain data, do it and ignore the following step:
- If in the recent messages is a request to get an analysis or a summary of the data, make an analysis or summary of the on-chain data based on all your knowledge and return it.

`;

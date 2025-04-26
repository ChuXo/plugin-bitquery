export const tokenChartParamTemplate = `Given the recent messages and information below:

{{recentMessages}}

Extract the following information about the requested token chart data:
- Chain to execute on: Must be one of [8453, 1, 42161, 56]. The associated chain IDs: for Base: 8453, Ethereum: 1, Arbitrum: 42161, BSC: 56. Default is 8453 (Base).
- The Token or Coin (for field baseCurrency) which can be a Symbol (like WETH, WBTC etc.), a Name (like Ethereum, Wrapped BTC, Virtuals etc.) or an EVM address (starting with "0x" and 42 characters long).
- Time period: The time period for the historical data (e.g., "24h", "7d", "30d", "1y"). Default is "24h".

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "chain": number | null,
    "baseCurrency": string | null,
    "timeperiod": string | null
}
\`\`\`
`;

export const tokenChartTemplate = `Given the recent messages and information below:

# Recent Messages:
{{recentMessages}}

# On-Chain Data:
{{onchainKnowledge}}

- If the recent messages include a request to display the raw data, return the token chart data as a list of prices with datetimes and ignore the following steps.
- If the recent messages include a request to analyze the on-chain data or prepare a post based on the analyzed data, perform the analysis and return the result.
- If the recent messages include a request to get an analysis or summary of the data, analyze or summarize the token chart data based on all your knowledge and return it.

# Token Chart Data:
{{chartData}}

# Instructions:
1. If raw data is requested, return the token chart data as a list of prices with datetimes in the following format:
\`\`\`json
{
    "chain": number,
    "baseCurrency": string,
    "timeperiod": string,
    "data": [
        { "datetime": "YYYY-MM-DD HH:MM:SS", "price": number },
        { "datetime": "YYYY-MM-DD HH:MM:SS", "price": number },
        ...
    ]
}
\`\`\`

2. If analysis or summary is requested, provide a detailed analysis of the token's price trends, including:
   - Ignore and filter outany outlier data points or data which seem to be incorrect or not reliable, especially if it is a unrealistic price or date and single data points.
   - Key price movements (e.g., highest and lowest prices).
   - Trends over the specified time period.
   - Any notable patterns or anomalies.

3. If a post or report is requested, format the analysis into a structured post or report suitable for sharing.

# Example Post (limited to 206 chars):

'''
📊 VIRTUAL 7-Day Analysis:

- High/Low: $2.32/$1.29
- Trend: Up, then correction
- Pattern: Double-top, consolidating
- Prediction: Watch for breakout

Stay informed! 🌟
'''

`;

# `@elizaos/plugin-bitquery`

This plugin provides actions and providers for interacting with chains.

---

## Configuration

For windows wsl2 ubuntu some problems can occur, use node 22.12.2 (but first try 23.3.0)

### Default Setup

1. Add plugin-bitquery to your plugins in the character file:

```
"plugins": ["@elizaos/plugin-bitquery"],
```

1. Add bitquery API, CLIENT_ID and CLIENT SECRET (bitquery v2) to your `.env` file or specify in the character file like below.

```env
# Bitquery
BITQUERY_CLIENT_ID=
BITQUERY_CLIENT_SECRET=
```

### Adding Support for Other Chains

By default, **Ethereum mainnet** is enabled. To enable support for additional chains, add them to the character config like this:

```json
 "plugins": ["@elizaos/plugin-bitquery"],
    "clients": [],
    "modelProvider": "openai",
    "settings": {
        "secrets": {
            "BITQUERY_CLIENT_ID": "YOUR_BITQUERY_CLIENT_ID",
            "BITQUERY_CLIENT_SECRET": "YOUR_BITQUERY_CLIENT_SECRET",
            "INFURA_API_KEY": "YOUR_INFURA_API_KEY",
            "CACHE_DURATION_MINUTES": "480",
        },
        "chains": {
            "evm": ["base", "ethereum", "bsc"]
        }
    },
```

Currently only "base", "ethereum", "bsc" are supported. More coming soon. (bsc is not supported for total supply and market cap)

### Using the cache to control requests

By default, the provider requests the latest on-chain data and injects it to the agent before replying to the user. To control the frequency of these requests, you can set the `CACHE_DURATION_MINUTES` environment variable.

### Using custom RPC Url to fetch totalSupply and calculate marketcaps:

By default, no totalsupply gets fetched and therefore no marketcap can be calculated. To activate the fetch of the totalsupply to calculate the marketcap, insert the INFURA_API_KEY into the secrets of env or the character config like above.

Currently available for ethereum and base

## Provider

The **onchainProvider** requests the latest market performance on every agent response
The name, symbol, 24h price change, and 24h volume and more are returned for the:

- Top Tokens by 24h Volume
- Top Gainer Tokens by 24h Price Change (currently only ethereum and bsc)
- Top Loser Tokens by 24h Price Change (currently only ethereum and bsc)

Latest Pairs deployed coming soon.

---

## Actions

Let the agent query on-chain transactions for you. Find tokens by dex or within a range of price change, volume, market cap, and more.

The ability to do

- DeFi stratgies
- Flashloans
- Sniping
- Volume Bot (Market making)
- Wallet bundler
- and more coming soon!

Thank you fo supporting!

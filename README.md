# `@elizaos-plugins/plugin-bitquery`

This plugin provides actions (and providers) for interacting with chains.

---

![alt text](https://github.com/ChuXo/plugin-bitquery/blob/main/assets/banner.png?raw=true)

## Configuration

For windows wsl2 ubuntu some problems can occur, use node 22.12.2 (but first try 23.3.0)

### Default Setup

1. Add plugin-bitquery to your plugins in the character file:

```
"plugins": ["@elizaos-plugins/plugin-bitquery"],
```

1. Add bitquery API, CLIENT_ID and CLIENT SECRET (bitquery v2) to your `.env` file or specify in the character file like below.

```env
# Bitquery
BITQUERY_CLIENT_ID=
BITQUERY_CLIENT_SECRET=
```

### Adding env values in character file

```json
 "plugins": ["@elizaos-plugins/plugin-bitquery"],
    "clients": [],
    "modelProvider": "openai",
    "settings": {
        "secrets": {
            "BITQUERY_CLIENT_ID": "YOUR_BITQUERY_CLIENT_ID",
            "BITQUERY_CLIENT_SECRET": "YOUR_BITQUERY_CLIENT_SECRET",
            "INFURA_API_KEY": "YOUR_INFURA_API_KEY",
            "CACHE_DURATION_MINUTES": "480",
        },
    },
```

Currently only "base", "ethereum", "bsc" are supported. More coming soon. (bsc is not supported for total supply and market cap)

## Actions

Let the agent query on-chain transactions for you. Find tokens top performing tokens and more.

Call actions with:

- Get Top Tokens by Volume of the past [timeperiod] on [chain] 
- Get Top Tokens Performance on [chain]                 // returns top tokens with price performance of all different timeperiods  
- Top Gainer Tokens by [timeperiod] Price Change on [chain]
- Top Loser Tokens by [timeperiod] Price Change on [chain]
- Latest Pairs deployed on [chain] in the past [timeperiod]
- Get and analyze chart of [address] on [chain] of the past [timeperiod]
  
  Available timeperiods: ["1h", "3h", "24h", "7d", "30d", "1y"]. Default is "24h".
  Available chains [Ethereum, BSC, Base]

![alt text](https://github.com/ChuXo/plugin-bitquery/blob/main/assets/screenshots/screenshot1.png?raw=true)

## Provider

The **onchainProvider** requests the latest market performance on every agent response
The name, symbol, 24h price change, and 24h volume and more are returned for the:

- Top Tokens by 24h Volume
- Top Gainer Tokens by 24h Price Change (currently only ethereum and bsc)
- Top Loser Tokens by 24h Price Change (currently only ethereum and bsc)
- Latest Pairs deployed

Add "onchainProvider" to providers in index file to activate.
---

### Using the cache to control requests

By default, the provider requests the latest on-chain data and injects it to the agent before replying to the user. To control the frequency of these requests, you can set the `CACHE_DURATION_MINUTES` settings variable.

### Using custom RPC Url to fetch totalSupply and calculate marketcaps:

By default, no totalsupply gets fetched and therefore no marketcap can be calculated. To activate the fetch of the totalsupply to calculate the marketcap, insert the INFURA_API_KEY into the secrets of env or the character config like above.

Currently available for ethereum, bsc and base

We work on the following additional actions:

The ability to do

- DeFi stratgies
- Flashloans
- Sniping
- Volume Bot (Market making)
- Wallet bundler
- and more coming soon!

Thank you fo supporting!

## Links

https://prisma.farm/
https://app.prisma.farm/
https://minter.prisma.farm/
https://bitquery.io/

Supported by Prisma AI (@prisma_finance on X) https://x.com/prisma_finance
Dev (@DefiRatesNet on X) https://x.com/DefiRatesNet
Powered by Bitquery (@bitquery_io on X) https://x.com/Bitquery_io

## Licence
MIT

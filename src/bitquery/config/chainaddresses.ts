export const NativeCoinOfChain = new Map([
    [
        1,
        {
            symbol: "ETH",
            name: "Ethereum",
            address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            decimals: 18,
        },
    ],
    [
        56,
        {
            symbol: "BNB",
            name: "Binance Coin",
            address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            decimals: 18,
        },
    ],
    [
        8453,
        {
            symbol: "ETH",
            name: "Ethereum",
            address: "0x4200000000000000000000000000000000000006",
            decimals: 18,
        },
    ],
]);

export const WrappedNativeCoinOfChain = new Map([
    [
        1,
        {
            symbol: "WETH",
            name: "Wrapped Ethereum",
            address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            decimals: 18,
        },
    ],
    [
        56,
        {
            symbol: "WBNB",
            name: "Wrapped Binance Coin",
            address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
            decimals: 18,
        },
    ],
    [
        8453,
        {
            symbol: "WETH",
            name: "Wrapped Ethereum",
            address: "0x4200000000000000000000000000000000000006",
            decimals: 18,
        },
    ],
]);

export const StableCoinsOfChain = new Map([
    [
        1,
        [
            {
                address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
                symbol: "USDT",
            },
            {
                address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                symbol: "USDC",
            },
            {
                address: "0x6b175474e89094c44da98b954eedeac495271d0f",
                symbol: "DAI",
            },
        ],
    ],
    [
        56,
        [
            {
                address: "0x55d398326f99059ff775485246999027b3197955",
                symbol: "USDT",
            },
            {
                address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
                symbol: "BUSD",
            },
            {
                address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
                symbol: "USDC",
            },
        ],
    ],
    [
        8453,
        [
            {
                address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                symbol: "USDC",
            },
            {
                address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
                symbol: "USDT",
            },
        ],
    ],
]);

// needs to be in this order weth, usdc, usdt for toptokens
export const ChainQuoteCurrencies = new Map([
    [
        1,
        [
            "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
            "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
            "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
            "0x4fabb145d64652a948d72533023f6e7a623c7c53", // BUSD
        ],
    ],
    [
        56,
        [
            "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // WBNB
            "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC
            "0x55d398326f99059ff775485246999027b3197955", // USDT
            "0xe9e7cea3dedca5984780bafc599bd69add087d56", // BUSD
        ],
    ],
    [
        8453,
        [
            "0x4200000000000000000000000000000000000006", // WETH
            "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
            "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
            "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b", // VIRTUALS
        ],
    ],
]);

export const ChainDexProtocols = new Map([
    [
        1,
        [
            {
                address: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
                name: "Uniswap v2",
            },
            {
                address: "0x1f98431c8ad98523631ae4a59f267346ea31f984",
                name: "Uniswap v3",
            },
        ],
    ],
    [
        56,
        [
            {
                address: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
                name: "PancakeSwap v2",
            },
            {
                address: "0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865",
                name: "Pancakeswap v3",
            },
            {
                address: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
                name: "Uniswap v2",
            },
        ],
    ],
    [
        8453,
        [
            {
                address: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
                name: "Uniswap v2",
            },
            {
                address: "0x6Cb442acF35158D5eDa88fe602221b67B400Be3E",
                name: "Aerodrome",
            },
        ],
    ],
]);

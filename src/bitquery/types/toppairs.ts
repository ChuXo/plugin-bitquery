export type TopPairResponse = TopPair[];

export interface TopPair {
    symbol: string;
    address: string;
    decimals: number;
    name: string;
    volume: string;
    nativePrice: number;
    priceType: string;
    swaps: number;
    change: string;
    quoteCurrency: {
        symbol: string;
        address: string;
    };
    protocol?: string;
    protocolType?: string;
    price?: string;
    marketCap?: string;
    totalSupply?: string;
    created?: string;
}

export interface TopToken {
    symbol: string;
    address: string;
    decimals: number | null;
    name: string | null;
    priceType: string;
    price: number | null;
    change_10m: string | null;
    change_1h: string | null;
    change_3h: string | null;
    change_6h: string | null;
    change_12h: string | null;
    change_24h: string | null;
    change_7d: string | null;
    change_30d: string | null;
    marketCap: string | null;
    buyers: string | null;
    sellers: string | null;
    totalSupply: string | null;
    swaps: number;
    volume: number;
    quoteCurrency: {
        symbol: string;
        address: string;
    };
    protocol: string | null;
    protocolType: string | null;
}

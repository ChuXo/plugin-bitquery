export type CustomPairResponse = CustomTopPair[];

export interface CustomTopPair {
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
    protocol: string;
    protocolType: string;
    price?: string;
}

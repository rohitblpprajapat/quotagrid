import { type Chain } from 'viem';
export declare const DEFAULT_MONAD_RPC = "https://testnet-rpc.monad.xyz";
export declare const DEFAULT_EXPLORER_URL = "https://testnet.monadvision.com";
export declare const DEFAULT_CONTRACT_ADDRESS: `0x${string}`;
export declare const MONAD_RESERVE_BALANCE_WEI = 10000000000000000000n;
export declare const DEFAULT_GAS_MARGIN_WEI = 50000000000000000n;
export interface QuotaGridConfig {
    apiUrl: string;
    privateKey?: `0x${string}`;
    contractAddress?: `0x${string}`;
    rpcUrl: string;
    chain: Chain;
}
export declare function createMonadChain(rpcUrl?: string): Chain;
export declare function loadConfig(overrides?: Partial<QuotaGridConfig>): QuotaGridConfig;
//# sourceMappingURL=config.d.ts.map
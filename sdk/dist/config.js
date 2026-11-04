import { defineChain } from 'viem';
import { monadTestnet } from 'viem/chains';
export const DEFAULT_MONAD_RPC = 'https://testnet-rpc.monad.xyz';
export const DEFAULT_EXPLORER_URL = 'https://testnet.monadvision.com';
export const MONAD_RESERVE_BALANCE_WEI = 10000000000000000000n; // 10 MON reserve (D-015)
export const DEFAULT_GAS_MARGIN_WEI = 50000000000000000n; // 0.05 MON safety margin
export function createMonadChain(rpcUrl = DEFAULT_MONAD_RPC) {
    return defineChain({
        ...monadTestnet,
        rpcUrls: {
            default: { http: [rpcUrl] },
            public: { http: [rpcUrl] },
        },
    });
}
export function loadConfig(overrides) {
    const rawApiUrl = overrides?.apiUrl ||
        process.env.QUOTAGRID_API_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'http://localhost:3000';
    const apiUrl = rawApiUrl.replace(/\/+$/, '');
    let rawPk = overrides?.privateKey || process.env.QUOTAGRID_PRIVATE_KEY || process.env.PRIVATE_KEY;
    let privateKey = undefined;
    if (rawPk) {
        privateKey = (rawPk.startsWith('0x') ? rawPk : `0x${rawPk}`);
    }
    let rawContract = overrides?.contractAddress ||
        process.env.QUOTAGRID_CONTRACT ||
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    let contractAddress = undefined;
    if (rawContract) {
        contractAddress = (rawContract.startsWith('0x') ? rawContract : `0x${rawContract}`);
    }
    const rpcUrl = overrides?.rpcUrl ||
        process.env.MONAD_RPC_URL ||
        process.env.NEXT_PUBLIC_RPC_URL ||
        DEFAULT_MONAD_RPC;
    const chain = overrides?.chain || createMonadChain(rpcUrl);
    return {
        apiUrl,
        privateKey,
        contractAddress,
        rpcUrl,
        chain,
    };
}
//# sourceMappingURL=config.js.map
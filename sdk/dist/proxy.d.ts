import http from 'node:http';
import { QuotaGridClient } from './core.js';
export interface ProxyOptions {
    port?: number;
    host?: string;
    models?: string[];
    maxPricePerKTokenMON?: number;
    primary?: 'openai' | 'gemini';
    primaryBaseUrl?: string;
    primaryKeyEnv?: string;
    budget?: number;
    threshold?: number;
    client?: QuotaGridClient;
}
export declare function startProxyServer(opts?: ProxyOptions): http.Server;
//# sourceMappingURL=proxy.d.ts.map
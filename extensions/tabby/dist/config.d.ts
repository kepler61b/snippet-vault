import { ConfigProvider } from 'tabby-core';
export declare class SnippetVaultConfigProvider extends ConfigProvider {
    defaults: {
        snippetvault: {
            url: string;
            token: string;
            autoRefreshSeconds: number;
        };
    };
}

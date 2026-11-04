import { ConfigService } from 'tabby-core';
export interface SnippetFile {
    id?: string;
    filename: string;
    language: string;
    content: string;
}
export interface Snippet {
    id: string;
    title: string;
    description: string | null;
    tags: string;
    collectionId: string | null;
    files: SnippetFile[];
    createdAt?: string;
}
export interface Collection {
    id: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
    isSmart?: boolean;
    color?: string | null;
}
export interface TestResult {
    ok: boolean;
    message: string;
    snippetCount?: number;
    collectionCount?: number;
}
export declare class SnippetVaultService {
    private config;
    private cache;
    private lastFetch;
    constructor(config: ConfigService);
    getUrl(): string;
    getToken(): string;
    getCacheTtl(): number;
    isConfigured(): boolean;
    invalidateCache(): void;
    private getHeaders;
    testConnection(): Promise<TestResult>;
    getDataCached(force?: boolean): Promise<{
        collections: Collection[];
        snippets: Snippet[];
    }>;
    createSnippet(data: {
        title: string;
        content: string;
        description?: string;
        tags?: string;
        collectionId?: string | null;
    }): Promise<Snippet>;
}

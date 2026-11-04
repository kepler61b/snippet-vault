import { Injectable } from '@angular/core';
import { ConfigService } from 'tabby-core';
import { PLUGIN_VERSION } from './version';

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

@Injectable({ providedIn: 'root' })
export class SnippetVaultService {
  private cache: { collections: Collection[]; snippets: Snippet[] } | null = null;
  private lastFetch = 0;

  constructor(private config: ConfigService) {}

  getUrl(): string {
    const raw = this.config.store.snippetvault?.url || 'http://localhost:3000';
    return raw.trim().replace(/\/+$/, '');
  }

  getToken(): string {
    return (this.config.store.snippetvault?.token || '').trim();
  }

  getCacheTtl(): number {
    const sec = this.config.store.snippetvault?.autoRefreshSeconds || 60;
    return Math.max(10, sec) * 1000;
  }

  getAppVersion(): string {
    try {
      if (typeof navigator !== 'undefined' && navigator.userAgent) {
        const m = navigator.userAgent.match(/Tabby\/([0-9.]+)/i);
        if (m && m[1]) return m[1];
      }
    } catch {}
    return '1.0.238';
  }

  isConfigured(): boolean {
    return Boolean(this.getToken());
  }

  invalidateCache(): void {
    this.cache = null;
    this.lastFetch = 0;
  }

  private getHeaders(): Record<string, string> {
    const appVer = this.getAppVersion();
    return {
      Authorization: `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json',
      'User-Agent': `SnippetVault-Tabby/${PLUGIN_VERSION} Tabby/${appVer}`,
      'X-Client-Version': PLUGIN_VERSION,
      'X-Plugin-Version': PLUGIN_VERSION,
      'X-SnippetVault-Plugin-Version': PLUGIN_VERSION,
      'X-App-Version': appVer,
      'X-SnippetVault-App-Version': appVer,
      'X-SnippetVault-Client': 'tabby',
    };
  }

  async testConnection(): Promise<TestResult> {
    if (!this.isConfigured()) {
      return { ok: false, message: 'Токен API (PAT) не указан.' };
    }

    const baseUrl = this.getUrl();
    const appVer = encodeURIComponent(this.getAppVersion());
    try {
      const [resCols, resSnips] = await Promise.all([
        fetch(`${baseUrl}/api/collections?client=tabby&pluginVersion=${PLUGIN_VERSION}&appVersion=${appVer}`, {
          headers: this.getHeaders(),
        }),
        fetch(`${baseUrl}/api/snippets?client=tabby&pluginVersion=${PLUGIN_VERSION}&appVersion=${appVer}`, {
          headers: this.getHeaders(),
        }),
      ]);

      if (resSnips.status === 401 || resCols.status === 401) {
        return {
          ok: false,
          message: 'Ошибка авторизации (401). Проверьте правильность токена.',
        };
      }

      if (!resSnips.ok) {
        return {
          ok: false,
          message: `Ошибка сервера: HTTP ${resSnips.status}`,
        };
      }

      const colsData = await resCols.json().catch(() => ({}));
      const snipsData = await resSnips.json().catch(() => ({}));

      const collectionCount = Array.isArray(colsData.collections)
        ? colsData.collections.length
        : 0;
      const snippetCount = Array.isArray(snipsData.snippets)
        ? snipsData.snippets.length
        : 0;

      // Обновляем кеш раз уж получили свежие данные
      this.cache = {
        collections: colsData.collections || [],
        snippets: snipsData.snippets || [],
      };
      this.lastFetch = Date.now();

      return {
        ok: true,
        message: 'Соединение успешно установлено!',
        snippetCount,
        collectionCount,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: `Не удалось подключиться к ${baseUrl}: ${err.message || err}`,
      };
    }
  }

  async getDataCached(force = false): Promise<{ collections: Collection[]; snippets: Snippet[] }> {
    const now = Date.now();
    if (!force && this.cache && now - this.lastFetch < this.getCacheTtl()) {
      return this.cache;
    }

    if (!this.isConfigured()) {
      return { collections: [], snippets: [] };
    }

    const baseUrl = this.getUrl();
    const headers = this.getHeaders();
    const appVer = encodeURIComponent(this.getAppVersion());

    const [colsRes, snipsRes] = await Promise.all([
      fetch(`${baseUrl}/api/collections?client=tabby&pluginVersion=${PLUGIN_VERSION}&appVersion=${appVer}`, { headers }),
      fetch(`${baseUrl}/api/snippets?client=tabby&pluginVersion=${PLUGIN_VERSION}&appVersion=${appVer}`, { headers }),
    ]);

    if (!snipsRes.ok || !colsRes.ok) {
      if (snipsRes.status === 401 || colsRes.status === 401) {
        throw new Error('Неверный или просроченный токен SnippetVault (401)');
      }
      throw new Error(`Ошибка загрузки данных SnippetVault: HTTP ${snipsRes.status}`);
    }

    const colsData = await colsRes.json();
    const snipsData = await snipsRes.json();

    this.cache = {
      collections: colsData.collections || [],
      snippets: snipsData.snippets || [],
    };
    this.lastFetch = now;
    return this.cache;
  }

  async createSnippet(data: {
    title: string;
    content: string;
    description?: string;
    tags?: string;
    collectionId?: string | null;
  }): Promise<Snippet> {
    if (!this.isConfigured()) {
      throw new Error('Токен SnippetVault не настроен');
    }

    const baseUrl = this.getUrl();
    const appVer = encodeURIComponent(this.getAppVersion());
    const res = await fetch(`${baseUrl}/api/snippets?client=tabby&pluginVersion=${PLUGIN_VERSION}&appVersion=${appVer}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        title: data.title,
        description: data.description || 'Сохранено из терминала Tabby',
        tags: data.tags || 'terminal,tabby',
        collectionId: data.collectionId || null,
        files: [
          {
            filename: 'snippet.sh',
            language: 'shell',
            content: data.content,
          },
        ],
      }),
    });

    if (res.status === 401) {
      throw new Error('Ошибка авторизации (401). Проверьте токен.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const json = await res.json();
    // Инвалидируем кеш, чтобы новый сниппет сразу отображался в контекстном меню
    this.invalidateCache();
    return json.snippet;
  }
}

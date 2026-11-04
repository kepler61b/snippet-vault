import { Component, Injectable } from '@angular/core';
import { ConfigService, PlatformService } from 'tabby-core';
import { SettingsTabProvider } from 'tabby-settings';
import { SnippetVaultService, TestResult } from './vault.service';
import { SNIPPETVAULT_LOGO_BASE64 } from './logo';
import { PLUGIN_VERSION } from './version';

@Injectable()
export class SnippetVaultSettingsTabProvider extends SettingsTabProvider {
  id = 'snippetvault';
  icon = 'code';
  title = 'SnippetVault';

  getComponentType(): any {
    return SnippetVaultSettingsTabComponent;
  }
}

@Component({
  template: `
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h3 class="m-0">Настройки SnippetVault</h3>
      <a
        href="javascript:void(0)"
        (click)="openGithub()"
        class="badge bg-secondary bg-opacity-25 text-body text-decoration-none px-3 py-2 cursor-pointer"
        title="Открыть репозиторий на GitHub"
      >
        made by <strong>Kepler61b</strong>
      </a>
    </div>

    <div class="card mb-4 p-3 bg-secondary bg-opacity-10 border-0 rounded">
      <div class="d-flex align-items-center">
        <div class="me-3 d-flex align-items-center justify-content-center flex-shrink-0">
          <img
            [src]="logo"
            alt="SnippetVault"
            style="width: 48px; height: 48px; object-fit: contain; border-radius: 10px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);"
          />
        </div>
        <div>
          <strong>Интеграция с вашей базой сниппетов SnippetVault</strong>
          <div class="text-muted small">
            Позволяет быстро сохранять выделенные команды из терминала и вставлять сниппеты прямо
            в сессию через контекстное меню (ПКМ).
          </div>
        </div>
      </div>
    </div>

    <div class="mb-3">
      <label class="form-label fw-bold">URL сервера SnippetVault</label>
      <input
        type="url"
        class="form-control"
        placeholder="http://localhost:3000 или https://vault.example.com"
        [(ngModel)]="config.store.snippetvault.url"
        (ngModelChange)="saveConfig()"
      />
      <div class="form-text text-muted">
        Адрес работающего экземпляра SnippetVault (без слэша на конце).
      </div>
    </div>

    <div class="mb-3">
      <label class="form-label fw-bold">Персональный токен доступа (PAT)</label>
      <div class="input-group">
        <input
          [type]="showToken ? 'text' : 'password'"
          class="form-control"
          placeholder="snip_..."
          [(ngModel)]="config.store.snippetvault.token"
          (ngModelChange)="saveConfig()"
        />
        <button
          class="btn btn-outline-secondary"
          type="button"
          (click)="showToken = !showToken"
        >
          {{ showToken ? 'Скрыть' : 'Показать' }}
        </button>
      </div>
      <div class="form-text text-muted">
        Сгенерируйте персональный токен в веб-интерфейсе SnippetVault:
        <a
          href="javascript:void(0)"
          (click)="openTokenPage()"
          class="text-decoration-underline ms-1"
        >
          Профиль &rarr; API &amp; Tokens
        </a>
      </div>
    </div>

    <div class="mb-4">
      <label class="form-label fw-bold">Автообновление кеша (секунды)</label>
      <input
        type="number"
        min="10"
        max="3600"
        class="form-control w-25"
        [(ngModel)]="config.store.snippetvault.autoRefreshSeconds"
        (ngModelChange)="saveConfig()"
      />
      <div class="form-text text-muted">
        Время кеширования списка коллекций и сниппетов для мгновенного отклика контекстного меню.
      </div>
    </div>

    <div class="d-flex align-items-center gap-2 mb-4">
      <button
        class="btn btn-primary"
        [disabled]="isTesting || !config.store.snippetvault.token"
        (click)="testConnection()"
      >
        <span *ngIf="isTesting" class="spinner-border spinner-border-sm me-1"></span>
        {{ isTesting ? 'Проверка...' : 'Проверить подключение' }}
      </button>

      <button
        class="btn btn-secondary"
        (click)="refreshCache()"
      >
        Очистить кеш
      </button>

      <span
        *ngIf="testResult"
        class="badge px-3 py-2"
        [class.bg-success]="testResult.ok"
        [class.bg-danger]="!testResult.ok"
      >
        {{ testResult.message }}
        <span *ngIf="testResult.ok && testResult.snippetCount !== undefined">
          (Доступно сниппетов: {{ testResult.snippetCount }}, коллекций: {{ testResult.collectionCount }})
        </span>
      </span>
    </div>

    <hr />

    <div class="mt-4">
      <h5>Как пользоваться:</h5>
      <ul class="text-muted small ps-3">
        <li><strong>Сохранить в SnippetVault:</strong> выделите любой текст в терминале &rarr; нажмите правую кнопку мыши &rarr; выберите <em>«Сохранить в SnippetVault»</em> &rarr; укажите заголовок сниппета.</li>
        <li><strong>Загрузить из SnippetVault:</strong> нажмите правую кнопку мыши в любой точке терминала &rarr; наведите на <em>«Загрузить из SnippetVault»</em> &rarr; выберите коллекцию &rarr; кликните по сниппету для автоматической вставки в командную строку.</li>
      </ul>
    </div>

    <div class="mt-4 pt-3 border-top d-flex justify-content-between align-items-center text-muted small">
      <span>SnippetVault Tabby Plugin v{{ version }}</span>
      <a
        href="javascript:void(0)"
        (click)="openGithub()"
        class="text-decoration-none text-muted cursor-pointer"
      >
        made by <strong class="text-info">Kepler61b</strong> ↗
      </a>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
        max-width: 800px;
      }
      .gap-2 {
        gap: 0.5rem;
      }
      .cursor-pointer {
        cursor: pointer;
      }
    `,
  ],
})
export class SnippetVaultSettingsTabComponent {
  readonly logo = SNIPPETVAULT_LOGO_BASE64;
  readonly version = PLUGIN_VERSION;
  showToken = false;
  isTesting = false;
  testResult: TestResult | null = null;

  constructor(
    public config: ConfigService,
    private vault: SnippetVaultService,
    private platform: PlatformService
  ) {}

  saveConfig(): void {
    this.vault.invalidateCache();
    this.config.save();
  }

  async testConnection(): Promise<void> {
    this.isTesting = true;
    this.testResult = null;
    try {
      this.testResult = await this.vault.testConnection();
    } finally {
      this.isTesting = false;
    }
  }

  refreshCache(): void {
    this.vault.invalidateCache();
    this.testResult = {
      ok: true,
      message: 'Кеш успешно очищен.',
    };
  }

  openTokenPage(): void {
    const url = `${this.vault.getUrl()}/settings/tokens`;
    this.platform.openExternal(url);
  }

  openGithub(): void {
    this.platform.openExternal('https://github.com/Kepler61b/snippet-vault');
  }
}

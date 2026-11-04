import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  TabContextMenuItemProvider,
  BaseTabComponent,
  MenuItemOptions,
  NotificationsService,
  PromptModalComponent,
} from 'tabby-core';
import { BaseTerminalTabComponent } from 'tabby-terminal';
import { SnippetVaultService, Collection, Snippet } from './vault.service';

@Injectable()
export class SnippetVaultContextMenuProvider extends TabContextMenuItemProvider {
  weight = 10;

  constructor(
    private vault: SnippetVaultService,
    private notifications: NotificationsService,
    private ngbModal: NgbModal
  ) {
    super();
  }

  async getItems(tab: BaseTabComponent, tabHeader?: boolean): Promise<MenuItemOptions[]> {
    if (tabHeader || !(tab instanceof BaseTerminalTabComponent)) {
      return [];
    }

    const termTab = tab as BaseTerminalTabComponent<any>;
    const selection = termTab.frontend?.getSelection()?.trim() || '';
    const isConfigured = this.vault.isConfigured();

    const items: MenuItemOptions[] = [];

    // 1. Пункт "Сохранить в SnippetVault"
    if (!selection) {
      items.push({
        label: 'Сохранить в SnippetVault (выделите текст)',
        enabled: false,
      });
    } else if (!isConfigured) {
      items.push({
        label: 'Сохранить в SnippetVault (не настроен токен)',
        enabled: false,
      });
    } else {
      items.push({
        label: 'Сохранить в SnippetVault',
        enabled: true,
        click: () => this.saveSelection(termTab, selection),
      });
    }

    // 2. Пункт "Загрузить из SnippetVault" с вложенным подменю коллекций
    if (!isConfigured) {
      items.push({
        label: 'Загрузить из SnippetVault (требуется настройка)',
        enabled: true,
        click: () => {
          this.notifications.info(
            'Откройте Настройки -> SnippetVault и введите URL и персональный токен (PAT).'
          );
        },
      });
    } else {
      const submenu = await this.buildCollectionsSubmenu(termTab);
      items.push({
        label: 'Загрузить из SnippetVault',
        submenu,
      });
    }

    return items;
  }

  /**
   * Открывает окно ввода названия и сохраняет выделенный текст как сниппет
   */
  private async saveSelection(tab: BaseTerminalTabComponent<any>, text: string): Promise<void> {
    // Дефолтное название из первой осмысленной строки
    const firstLine =
      text
        .split('\n')[0]
        .replace(/^[#//\s*\->]+/, '')
        .trim()
        .slice(0, 50) || 'Команда терминала';

    const modal = this.ngbModal.open(PromptModalComponent);
    modal.componentInstance.prompt = 'Введите название сниппета SnippetVault:';
    modal.componentInstance.value = firstLine;

    const res: any = await modal.result.catch(() => null);
    if (!res) return;

    const title = (typeof res === 'string' ? res : res.value)?.trim();
    if (!title) return;

    try {
      await this.vault.createSnippet({
        title,
        content: text,
      });
      this.notifications.notice(`Сниппет "${title}" успешно сохранен в SnippetVault!`);
    } catch (err: any) {
      this.notifications.error(`Не удалось сохранить сниппет: ${err.message || err}`);
    }
  }

  /**
   * Формирует подменю:
   * - Кнопка ручного обновления списка
   * - Коллекции со своими сниппетами
   * - Сниппеты без коллекции
   */
  private async buildCollectionsSubmenu(tab: BaseTerminalTabComponent<any>): Promise<MenuItemOptions[]> {
    try {
      const { collections, snippets } = await this.vault.getDataCached();

      const submenu: MenuItemOptions[] = [
        {
          label: '🔄 Обновить список сниппетов',
          click: async () => {
            this.vault.invalidateCache();
            await this.vault.getDataCached(true);
            this.notifications.notice('Список сниппетов SnippetVault обновлен.');
          },
        },
        { type: 'separator' },
      ];

      if (!snippets || snippets.length === 0) {
        submenu.push({
          label: '(В хранилище пока нет сниппетов)',
          enabled: false,
        });
        return submenu;
      }

      // Группировка по коллекциям
      const collectionsMap = new Map<string, Collection>();
      for (const col of collections) {
        collectionsMap.set(col.id, col);
      }

      const snippetsByCollection = new Map<string, Snippet[]>();
      const rootSnippets: Snippet[] = [];

      for (const snip of snippets) {
        if (snip.collectionId && collectionsMap.has(snip.collectionId)) {
          const list = snippetsByCollection.get(snip.collectionId) || [];
          list.push(snip);
          snippetsByCollection.set(snip.collectionId, list);
        } else {
          rootSnippets.push(snip);
        }
      }

      // 1. Добавляем коллекции, в которых есть сниппеты
      for (const col of collections) {
        const colSnippets = snippetsByCollection.get(col.id);
        if (!colSnippets || colSnippets.length === 0) continue;

        submenu.push({
          label: `📁 ${col.name}`,
          submenu: colSnippets.map((snip) => ({
            label: snip.title,
            sublabel: snip.description || undefined,
            click: () => this.insertSnippet(tab, snip),
          })),
        });
      }

      // 2. Сниппеты без коллекции
      if (rootSnippets.length > 0) {
        if (snippetsByCollection.size > 0) {
          submenu.push({ type: 'separator' });
        }
        submenu.push({
          label: '📄 Без коллекции',
          submenu: rootSnippets.map((snip) => ({
            label: snip.title,
            sublabel: snip.description || undefined,
            click: () => this.insertSnippet(tab, snip),
          })),
        });
      }

      return submenu;
    } catch (err: any) {
      return [
        {
          label: `Ошибка: ${err.message || err}`,
          enabled: false,
        },
        {
          label: '🔄 Попробовать снова',
          click: () => {
            this.vault.invalidateCache();
          },
        },
      ];
    }
  }

  /**
   * Вставляет содержимое первого файла клипа в строку ввода терминала
   */
  private insertSnippet(tab: BaseTerminalTabComponent<any>, snip: Snippet): void {
    const file = snip.files?.[0];
    const content = file?.content ?? '';
    if (!content) {
      this.notifications.error(`Сниппет "${snip.title}" пуст.`);
      return;
    }

    tab.sendInput(content);
  }
}

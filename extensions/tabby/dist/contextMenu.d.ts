import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TabContextMenuItemProvider, BaseTabComponent, MenuItemOptions, NotificationsService } from 'tabby-core';
import { SnippetVaultService } from './vault.service';
export declare class SnippetVaultContextMenuProvider extends TabContextMenuItemProvider {
    private vault;
    private notifications;
    private ngbModal;
    weight: number;
    constructor(vault: SnippetVaultService, notifications: NotificationsService, ngbModal: NgbModal);
    getItems(tab: BaseTabComponent, tabHeader?: boolean): Promise<MenuItemOptions[]>;
    /**
     * Открывает окно ввода названия и сохраняет выделенный текст как сниппет
     */
    private saveSelection;
    /**
     * Формирует подменю:
     * - Кнопка ручного обновления списка
     * - Коллекции со своими сниппетами
     * - Сниппеты без коллекции
     */
    private buildCollectionsSubmenu;
    /**
     * Вставляет содержимое первого файла клипа в строку ввода терминала
     */
    private insertSnippet;
}

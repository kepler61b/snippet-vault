import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabContextMenuItemProvider, ConfigProvider } from 'tabby-core';
import { SettingsTabProvider } from 'tabby-settings';

import { SnippetVaultConfigProvider } from './config';
import { SnippetVaultContextMenuProvider } from './contextMenu';
import {
  SnippetVaultSettingsTabComponent,
  SnippetVaultSettingsTabProvider,
} from './settingsTab.component';

@NgModule({
  imports: [CommonModule, FormsModule],
  declarations: [SnippetVaultSettingsTabComponent],
  entryComponents: [SnippetVaultSettingsTabComponent],
  providers: [
    {
      provide: TabContextMenuItemProvider,
      useClass: SnippetVaultContextMenuProvider,
      multi: true,
    },
    {
      provide: ConfigProvider,
      useClass: SnippetVaultConfigProvider,
      multi: true,
    },
    {
      provide: SettingsTabProvider,
      useClass: SnippetVaultSettingsTabProvider,
      multi: true,
    },
  ],
})
export default class SnippetVaultTabbyModule {}

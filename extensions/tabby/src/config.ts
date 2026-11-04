import { Injectable } from '@angular/core';
import { ConfigProvider } from 'tabby-core';

@Injectable()
export class SnippetVaultConfigProvider extends ConfigProvider {
  defaults = {
    snippetvault: {
      url: 'http://localhost:3000',
      token: '',
      autoRefreshSeconds: 60,
    },
  };
}

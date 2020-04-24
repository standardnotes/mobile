import { Platform } from 'react-native';
import Server from '@Lib/snjs/httpManager';
import CSSParser from '@Style/Util/CSSParser';

export default class ThemeDownloader {
  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new ThemeDownloader();
    }

    return this.instance;
  }

  async downloadTheme(theme) {
    let errorBlock = error => {
      if (!theme.getNotAvailOnMobile()) {
        theme.setNotAvailOnMobile(true);
        theme.setDirty(true);
      }

      console.error('Theme download error', error);
    };

    var url = theme.hosted_url || theme.url;

    if (!url) {
      errorBlock(null);
      return;
    }

    if (Platform.OS === 'android' && url.includes('localhost')) {
      url = url.replace('localhost', '10.0.2.2');
    }

    return new Promise(resolve => {
      Server.get().getAbsolute(
        url,
        {},
        response => {
          let variables = CSSParser.cssToObject(response);
          resolve(variables);
        },
        () => {
          resolve(null);
        }
      );
    });
  }
}

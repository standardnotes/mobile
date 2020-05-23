import { Platform } from 'react-native';
import CSSParser from '@Style/Util/CSSParser';
import { SNTheme, SNHttpService } from 'snjs';

export default class ThemeDownloader {
  private static instance: ThemeDownloader;
  private httpService = new SNHttpService();

  static get() {
    if (!this.instance) {
      this.instance = new ThemeDownloader();
    }

    return this.instance;
  }

  async downloadTheme(theme: SNTheme) {
    let errorBlock = (error: null) => {
      console.error('Theme download error', error);
    };

    let url = theme.hosted_url;

    if (!url) {
      errorBlock(null);
      return;
    }

    if (Platform.OS === 'android' && url.includes('localhost')) {
      url = url.replace('localhost', '10.0.2.2');
    }

    return new Promise(async resolve => {
      try {
        const response = await this.httpService.getAbsolute(url, {});
        // @ts-ignore TODO: check response type
        let variables = CSSParser.cssToObject(response);
        resolve(variables);
      } catch (e) {
        resolve(null);
      }
    });
  }
}

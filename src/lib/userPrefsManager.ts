import { dateFromJsonString, isNullOrUndefined } from '@Lib/utils';
import Storage from '@Lib/snjs/storageManager';

export const LAST_EXPORT_DATE_KEY = 'LastExportDateKey';
export const DONT_SHOW_AGAIN_UNSUPPORTED_EDITORS_KEY =
  'DoNotShowAgainUnsupportedEditorsKey';

export default class UserPrefsManager {
  private static instance: UserPrefsManager;
  data: Record<string, any>;
  static get() {
    if (!this.instance) {
      this.instance = new UserPrefsManager();
    }
    return this.instance;
  }

  constructor() {
    this.data = {};
  }

  async clearPref({ key }: { key: string }) {
    this.data[key] = null;
    return Storage.get().clearKeys([key]);
  }

  async setPref({ key, value }: { key: string; value: unknown }) {
    await Storage.get().setItem(key, JSON.stringify(value));
    this.data[key] = value;
  }

  async getPref({ key }: { key: string }) {
    if (isNullOrUndefined(this.data[key])) {
      const item = await Storage.get().getItem(key);
      this.data[key] = JSON.parse(item ?? '');
    }

    return this.data[key];
  }

  async getPrefAsDate({ key }: { key: string }) {
    if (isNullOrUndefined(this.data[key])) {
      const item = await Storage.get().getItem(key);
      this.data[key] = dateFromJsonString(item ?? '');
    }

    return this.data[key];
  }

  async isPrefSet({ key }: { key: string }) {
    return (await this.getPref({ key: key })) !== null;
  }

  async isPrefEqualTo({ key, value }: { key: string; value: unknown }) {
    return (await this.getPref({ key: key })) === value;
  }
}

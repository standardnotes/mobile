import {
  dateFromJsonString,
  isNullOrUndefined
} from '@Lib/utils';
import Storage from '@SFJS/storageManager';

export const LAST_EXPORT_DATE_KEY                     = 'LastExportDateKey';
export const DONT_SHOW_AGAIN_UNSUPPORTED_EDITORS_KEY  = 'DoNotShowAgainUnsupportedEditorsKey';
export const AGREED_TO_OFFLINE_DISCLAIMER_KEY         = 'AgreedToOfflineDisclaimerKey';

export default class UserPrefsManager {
  static instance = null
  static get() {
    if(this.instance == null) {
      this.instance = new UserPrefsManager();
    }
    return this.instance;
  }

  constructor() {
    this.data = {};
  }

  async clearPref({ key }) {
    this.data[key] = null;
    return Storage.get().clearKeys([key]);
  }

  async setPref({ key, value }) {
    await Storage.get().setItem(key, JSON.stringify(value));
    this.data[key] = value;
  }

  async getPref({ key }) {
    if(isNullOrUndefined(this.data[key])) {
      this.data[key] = JSON.parse(await Storage.get().getItem(key));
    }

    return this.data[key];
  }

  async getPrefAsDate({ key }) {
    if(isNullOrUndefined(this.data[key])) {
      this.data[key] = dateFromJsonString(await Storage.get().getItem(key));
    }

    return this.data[key];
  }

  async isPrefSet({ key }) {
    return await this.getPref({ key: key }) !== null;
  }

  async isPrefEqualTo({ key, value }) {
    return await this.getPref({ key: key }) === value;
  }
}

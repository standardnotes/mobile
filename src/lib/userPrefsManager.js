import Storage from './sfjs/storageManager'

const LastExportDateKey = "LastExportDateKey";

export default class UserPrefsManager {

  static instance = null;
  static get() {
    if(this.instance == null) {
      this.instance = new UserPrefsManager();
    }
    return this.instance;
  }

  async setLastExportDate(date) {
    await Storage.get().setItem(LastExportDateKey, JSON.stringify(date));
    this.lastExportDate = date;
  }

  async clearLastExportDate() {
    this.lastExportDate = null;
    return Storage.get().clearKeys([LastExportDateKey]);
  }

  async getLastExportDate() {
    if(!this.lastExportDate) {
      var date = await Storage.get().getItem(LastExportDateKey);
      if(date) {
        this.lastExportDate = new Date(JSON.parse(date));
      }
    }

    return this.lastExportDate;
  }
}

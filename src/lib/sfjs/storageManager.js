import { AsyncStorage } from 'react-native';

export default class Storage extends SFStorageManager {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new Storage();
    }

    return this.instance;
  }

  async getItem(key) {
    try {
      return AsyncStorage.getItem(key);
    } catch (error) {
      console.log("Error getting item", error);
      return null;
    }
  }

  async getMultiItems(keys) {
    return AsyncStorage.multiGet(keys).then((stores) => {
      var items = {};
      stores.map((result, i, store) => {
        let key = store[i][0];
        let value = store[i][1];
        items[key] = value;
      });
      return items;
    });
  }

  async setItem(key, value) {
    if(value == null || value == undefined || key == null || key == undefined) {
      return;
    }
    try {
      return AsyncStorage.setItem(key, value);
    } catch (error) {
      console.log("Error setting item", error);
      return null;
    }
  }

  async removeItem(key) {
    return AsyncStorage.removeItem(key);
  }

  async clearKeys(keys) {
    return AsyncStorage.multiRemove(keys);
  }

  async clear() {
    return AsyncStorage.clear();
  }

  // Models

  async getAllModels() {
    var items = [];
    var keys = await AsyncStorage.getAllKeys();

    var stores = await AsyncStorage.multiGet(keys);
    stores.map((result, i, store) => {
      // get at each store's key/value so you can work with it
      let key = store[i][0];
      if(key.includes("Item-")) {
        let value = store[i][1];
        items.push(JSON.parse(value));
      }
    })

    return items;
  }

  keyForItem(item) {
    return "Item-" + item.uuid;
  }

  async getAllModelKeys() {
    var keys = await AsyncStorage.getAllKeys();
    var filtered = keys.filter((key) => {
      return key.includes("Item-");
    })
    return filtered;
  }

  async saveModel(item) {
    return this.saveModel([item]);
  }

  /*
    // Note: multiset is not working properly; returns with error
    AsyncStorage.multiSet(data, function(error){ callback(); })
    Each item is saved individually.
  */
  async saveModels(items) {
    if(items.length == 0) {
      return;
    }

    return Promise.all(items.map((item) => {
      return AsyncStorage.setItem(this.keyForItem(item), JSON.stringify(item));
    }));
  }

  async deleteModel(item) {
    return AsyncStorage.removeItem(this.keyForItem(item));
  }

  async clearAllModels(callback) {
    var itemKeys = await this.getAllModelKeys();
    return AsyncStorage.multiRemove(itemKeys);
  }
}

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import AlertManager from './alertManager';

export default class Storage extends SFStorageManager {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new Storage();
    }

    return this.instance;
  }

  constructor() {
    super();
    this.isAndroid = Platform.OS == 'android';
    this.platformString = this.isAndroid ? "Android" : "iOS";
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
    const itemsFromStores = (stores) => {
      let items = [];
      stores.map((result, i, store) => {
        let key = store[i][0];
        let value = store[i][1];
        if(value) {
          items.push(JSON.parse(value));
        }
      })

      return items;
    }

    /*
    As of react-native-asyncstorage 1.4.0:

    If Android has items saved that are over ~1MB, then:

      let stores = await AsyncStorage.multiGet(keys);
      items = items.concat(itemsFromStores(stores));

    will fail silently and no items will load.

      let item = await AsyncStorage.getItem(key);
      items.push(JSON.parse(item));

    will fail with an exception 'Cursor Window: Window is full'.
    But actually if you wrap it in a try catch, then it will throw an exception correctly.
    So that's what we're using now on Android.

      let item = itemsFromStores(await AsyncStorage.multiGet([key]))[0];
      items.push(item);

    will succeed completely.

    Issue created here: https://github.com/react-native-community/react-native-async-storage/issues/105

    So what we'll do for now is if Android, use multiGet with just 1 key each time.
    We need to determine why multiGet([key]) works, but getItem(key) doesn't.

    It looks like the reason getItem fails while multiGet doesn't is because getItem
    correctly returns the exception. However, even when there is an exception, getItem
    internally still retrieves the item value. So the value and exception are both present,
    but only the exception is sent.

    Whereas with multiGet, exceptions aren't reported at all, so the value is sent up.
    When multiGet gets patched to reports errors, I suspect this loophole will no longer work.

    However, getItem's `callback` param can be used instead of the promise, which will return both a value and an exception,
    and we can choose which one we want to handle.

    multiGet also currently totally fails if even 1 key fails:
    https://github.com/react-native-community/react-native-async-storage/issues/106
    */

    let keys = await this.getAllModelKeys();
    let items = [];
    let failedItemIds = [];
    if(this.isAndroid) {
      for(let key of keys) {
        try {
          let item = await AsyncStorage.getItem(key);
          if(item) {
            items.push(JSON.parse(item));
          }
        } catch (e) {
          let id = key.replace("Item-", "");
          failedItemIds.push(id);
          console.log("Error getting item", key, e);
        }
      }
    } else {
      try {
        let stores = await AsyncStorage.multiGet(keys);
        items = items.concat(itemsFromStores(stores));
      } catch(e) {
        console.log("Error getting items", keys, e);
      }
    }

    if(failedItemIds.length > 0) {
      this.showLoadFailForItemIds(failedItemIds);
    }

    return items;
  }

  showLoadFailForItemIds(failedItemIds) {
    let text = `The following items could not be loaded. This may happen if you are in low-memory conditions, or if the note is very large in size. For compatibility with ${this.platformString}, we recommend breaking up large notes into smaller chunks using the desktop or web app.\n\nItems:\n`
    let index = 0;
    text += failedItemIds.map((id) => {
      let result = id;
      if(index != failedItemIds.length - 1) {
        result += "\n";
      }
      index++;
      return result;
    })
    AlertManager.get().alert({title: "Unable to load item", text: text})
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
    if(!items || items.length == 0) {
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

import { Platform } from 'react-native';
import { SFStorageManager, SFItem as SNJSItem } from 'snjs';
import AsyncStorage from '@react-native-community/async-storage';
import AlertManager from '@Lib/snjs/alertManager';
import { isNullOrUndefined } from '@Lib/utils';

type SFItem = typeof SNJSItem;

export default class Storage extends SFStorageManager {
  private static instance: Storage;

  static get() {
    if (!this.instance) {
      this.instance = new Storage();
    }

    return this.instance;
  }

  constructor() {
    super();
    this.isAndroid = Platform.OS === 'android';
    this.platformString = this.isAndroid ? 'Android' : 'iOS';
  }

  async getItem(key: string) {
    try {
      return AsyncStorage.getItem(key);
    } catch (error) {
      console.log('Error getting item', error);
      return null;
    }
  }

  async getMultiItems(keys: string[]) {
    return AsyncStorage.multiGet(keys).then((stores) => {
      const items: Record<string, any> = {};
      stores.map((_result, i, store) => {
        let key = store[i][0];
        let value = store[i][1];
        items[key] = value;
      });
      return items;
    });
  }

  async setItem(key: string, value: string | undefined | null) {
    if (value === null || value === undefined || isNullOrUndefined(key)) {
      return;
    }
    try {
      return AsyncStorage.setItem(key, value);
    } catch (error) {
      console.log('Error setting item', error);
      return null;
    }
  }

  async removeItem(key: string) {
    return AsyncStorage.removeItem(key);
  }

  async clearKeys(keys: string[]) {
    return AsyncStorage.multiRemove(keys);
  }

  async clear() {
    return AsyncStorage.clear();
  }

  // Models
  async getAllModels() {
    const itemsFromStores = (stores: any[]) => {
      const items: any[] = [];
      stores.map((_result, i, store) => {
        // const key = store[i][0];
        const value = store[i][1];
        if (value) {
          items.push(JSON.parse(value));
        }
      });

      return items;
    };

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

    const keys = await this.getAllModelKeys();
    let items: any[] = [];
    const failedItemIds = [];
    if (this.isAndroid) {
      for (const key of keys) {
        try {
          const item = await AsyncStorage.getItem(key);
          if (item) {
            items.push(JSON.parse(item));
          }
        } catch (e) {
          const id = key.replace('Item-', '');
          failedItemIds.push(id);
          console.log('Error getting item', key, e);
        }
      }
    } else {
      try {
        let stores = await AsyncStorage.multiGet(keys);
        items = items.concat(itemsFromStores(stores));
      } catch (e) {
        console.log('Error getting items', keys, e);
      }
    }

    if (failedItemIds.length > 0) {
      this.showLoadFailForItemIds(failedItemIds);
    }

    return items;
  }

  showLoadFailForItemIds(failedItemIds: string[]) {
    let text = `The following items could not be loaded. This may happen if you are in low-memory conditions, or if the note is very large in size. For compatibility with ${this.platformString}, we recommend breaking up large notes into smaller chunks using the desktop or web app.\n\nItems:\n`;
    let index = 0;
    text += failedItemIds.map((id) => {
      let result = id;
      if (index !== failedItemIds.length - 1) {
        result += '\n';
      }
      index++;
      return result;
    });
    AlertManager.get().alert({ title: 'Unable to load item', text: text });
  }

  keyForItem(item: SFItem) {
    return 'Item-' + item.uuid;
  }

  async getAllModelKeys() {
    const keys = await AsyncStorage.getAllKeys();
    const filtered = keys.filter((key) => {
      return key.includes('Item-');
    });
    return filtered;
  }

  // TODO: Not sure about this
  // @ts-ignore
  async saveModel(item: SFItem) {
    return this.saveModel([item]);
  }

  /*
    // Note: multiset is not working properly; returns with error
    AsyncStorage.multiSet(data, function(error){ callback(); })
    Each item is saved individually.
  */
  async saveModels(items?: SFItem[]) {
    if (!items || items.length === 0) {
      return;
    }

    return Promise.all(
      items.map((item) => {
        return AsyncStorage.setItem(
          this.keyForItem(item),
          JSON.stringify(item)
        );
      })
    );
  }

  async deleteModel(item: SFItem) {
    return AsyncStorage.removeItem(this.keyForItem(item));
  }

  async clearAllModels() {
    const itemKeys = await this.getAllModelKeys();
    return AsyncStorage.multiRemove(itemKeys);
  }
}

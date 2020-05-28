import { DeviceInterface } from 'snjs';
import AsyncStorage from '@react-native-community/async-storage';
import { Platform } from 'react-native';
import ApplicationState from './ApplicationState';
import Keychain from './keychain';

export class MobileDeviceInterface extends DeviceInterface {
  constructor(namespace: string) {
    super(namespace, setTimeout, setInterval);
  }

  deinit() {
    super.deinit();
  }

  private getDatabaseKeyPrefix() {
    if (this.namespace) {
      return `${this.namespace}-Item-`;
    } else {
      return 'Item-';
    }
  }

  private keyForPayloadId(id: string) {
    return `${this.getDatabaseKeyPrefix()}${id}`;
  }

  private async getAllDatabaseKeys() {
    const keys = await AsyncStorage.getAllKeys();
    const filtered = keys.filter(key => {
      return key.includes(this.getDatabaseKeyPrefix());
    });
    return filtered;
  }

  private async getRawStorageKeyValues(keys: string[]) {
    if (Platform.OS === 'android') {
      const results = [];
      for (const key of keys) {
        try {
          const item = await AsyncStorage.getItem(key);
          if (item) {
            results.push({
              key,
              value: item,
            });
          }
        } catch (e) {
          console.log('Error getting item', key, e);
        }
      }
    } else {
      try {
        return AsyncStorage.multiGet(keys);
      } catch (e) {
        console.log('Error getting items', keys, e);
      }
    }

    return [];
  }

  getRawStorageValue(key: string) {
    return AsyncStorage.getItem(key);
  }

  async getAllRawStorageKeyValues(): Promise<Record<string, any>[]> {
    const keys = await AsyncStorage.getAllKeys();
    return this.getRawStorageKeyValues(keys);
  }
  setRawStorageValue(key: string, value: any): Promise<void> {
    return AsyncStorage.setItem(key, JSON.stringify(value));
  }
  removeRawStorageValue(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  }
  removeAllRawStorageValues(): Promise<void> {
    return AsyncStorage.clear();
  }
  openDatabase(): Promise<{ isNewDatabase?: boolean | undefined } | undefined> {
    // TODO: check if items do not have to be redownloaded in case of a failure
    return Promise.resolve({ isNewDatabase: false });
  }

  async getAllRawDatabasePayloads(): Promise<any[]> {
    const keys = await this.getAllDatabaseKeys();
    return this.getRawStorageKeyValues(keys);
  }
  saveRawDatabasePayload(payload: any): Promise<void> {
    return this.saveRawDatabasePayloads([payload]);
  }
  async saveRawDatabasePayloads(payloads: any[]): Promise<void> {
    if (payloads.length === 0) {
      return;
    }

    await Promise.all(
      payloads.map(item => {
        return AsyncStorage.setItem(this.keyForPayloadId(item), item);
      })
    );
  }
  removeRawDatabasePayloadWithId(id: string): Promise<void> {
    return this.removeRawStorageValue(this.keyForPayloadId(id));
  }
  async removeAllRawDatabasePayloads(): Promise<void> {
    const keys = await this.getAllDatabaseKeys();
    return AsyncStorage.multiRemove(keys.map(key => this.keyForPayloadId(key)));
  }
  getKeychainValue(): Promise<any> {
    return Keychain.getKeys();
  }
  setKeychainValue(value: any): Promise<void> {
    return Keychain.setKeys(value);
  }
  clearKeychainValue(): Promise<void> {
    return Keychain.clearKeys();
  }

  openUrl(url: string) {
    return ApplicationState.openURL(url);
  }
}

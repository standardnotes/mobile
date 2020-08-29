import AsyncStorage from '@react-native-community/async-storage';
import { Alert, Linking, Platform } from 'react-native';
import FingerprintScanner from 'react-native-fingerprint-scanner';
import { DeviceInterface } from 'snjs';
import Keychain from './keychain';

export type BiometricsType =
  | 'Fingerprint'
  | 'Face ID'
  | 'Biometrics'
  | 'Touch ID';

export class MobileDeviceInterface extends DeviceInterface {
  constructor() {
    super(setTimeout, setInterval);
  }

  deinit() {
    super.deinit();
  }

  private getDatabaseKeyPrefix() {
    if (this.namespace!.identifier) {
      return `${this.namespace!.identifier}-Item-`;
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
            results.push(JSON.parse(item));
          }
        } catch (e) {
          console.log('Error getting item', key, e);
        }
      }
      return results;
    } else {
      try {
        const items = await AsyncStorage.multiGet(keys);
        return items.map(item => {
          if (item[1]) {
            return JSON.parse(item[1]);
          }
        });
      } catch (e) {
        console.log('Error getting items', keys, e);
      }
    }

    return [];
  }

  async getRawStorageValue(key: string) {
    const item = await AsyncStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }
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
        return AsyncStorage.setItem(
          this.keyForPayloadId(item.uuid),
          JSON.stringify(item)
        );
      })
    );
  }
  removeRawDatabasePayloadWithId(id: string): Promise<void> {
    return this.removeRawStorageValue(this.keyForPayloadId(id));
  }
  async removeAllRawDatabasePayloads(): Promise<void> {
    const keys = await this.getAllDatabaseKeys();
    return AsyncStorage.multiRemove(keys);
  }

  async getNamespacedKeychainValue() {
    const keychain = await this.getRawKeychainValue();
    if (!keychain) {
      return;
    }
    return keychain[this.namespace!.identifier];
  }

  async setNamespacedKeychainValue(value: any) {
    let keychain = await this.getRawKeychainValue();
    if (!keychain) {
      keychain = {};
    }
    return Keychain.setKeys({
      ...keychain,
      [this.namespace!.identifier]: value,
    });
  }

  async clearNamespacedKeychainValue() {
    const keychain = await this.getRawKeychainValue();
    if (!keychain) {
      return;
    }
    delete keychain[this.namespace!.identifier];
    return Keychain.setKeys(keychain);
  }

  async getDeviceBiometricsAvailability() {
    // if (__DEV__) {
    //   const isAndroid = Platform.OS === 'android';
    //   if (isAndroid && Platform.Version < 23) {
    //     callback(true, 'Fingerprint', 'Fingerprint (Dev)');
    //   } else if (isAndroid) {
    //     callback(true, 'Biometrics', 'Biometrics');
    //   } else {
    //     callback(true, 'Face ID', 'Face ID');
    //   }
    //   return;
    // }
    try {
      await FingerprintScanner.isSensorAvailable();
      return true;
    } catch (e) {
      return false;
    }
  }

  getRawKeychainValue(): Promise<any> {
    return Keychain.getKeys();
  }

  clearRawKeychainValue() {
    return Keychain.clearKeys();
  }

  openUrl(url: string) {
    const showAlert = () => {
      Alert.alert('Unable to Open', `Unable to open URL ${url}.`);
    };

    Linking.canOpenURL(url)
      .then(supported => {
        if (!supported) {
          showAlert();
        } else {
          return Linking.openURL(url);
        }
      })
      .catch(() => showAlert());
  }
}

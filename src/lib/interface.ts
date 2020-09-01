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
    const results: { key: string; value: unknown }[] = [];
    if (Platform.OS === 'android') {
      for (const key of keys) {
        try {
          const item = await AsyncStorage.getItem(key);
          if (item) {
            results.push({ key, value: item });
          }
        } catch (e) {
          console.log('Error getting item', key, e);
        }
      }
    } else {
      try {
        for (const item of await AsyncStorage.multiGet(keys)) {
          if (item[1]) {
            results.push({ key: item[0], value: item[1] });
          }
        }
      } catch (e) {
        console.log('Error getting items', e);
      }
    }
    return results;
  }

  private async getDatabaseKeyValues(keys: string[]) {
    const results: unknown[] = [];
    if (Platform.OS === 'android') {
      for (const key of keys) {
        try {
          const item = await AsyncStorage.getItem(key);
          if (item) {
            try {
              results.push(JSON.parse(item));
            } catch (e) {
              results.push(item);
            }
          }
        } catch (e) {
          console.error('Error getting item', key, e);
        }
      }
    } else {
      try {
        for (const item of await AsyncStorage.multiGet(keys)) {
          if (item[1]) {
            try {
              results.push(JSON.parse(item[1]));
            } catch (e) {
              results.push(item[1]);
            }
          }
        }
      } catch (e) {
        console.error('Error getting items', e);
      }
    }
    return results;
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
    return Promise.resolve({ isNewDatabase: false });
  }

  async getAllRawDatabasePayloads(): Promise<unknown[]> {
    const keys = await this.getAllDatabaseKeys();
    return this.getDatabaseKeyValues(keys);
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
  getKeychainValue(): Promise<any> {
    return Keychain.getKeys();
  }
  setKeychainValue(value: any): Promise<void> {
    return Keychain.setKeys(value);
  }
  clearKeychainValue(): Promise<void> {
    return Keychain.clearKeys();
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

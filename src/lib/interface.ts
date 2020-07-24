import AsyncStorage from '@react-native-community/async-storage';
import { Alert, Linking } from 'react-native';
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
    try {
      const items = await AsyncStorage.multiGet(keys);
      return items.map(item => {
        if (item[1]) {
          return {
            key: item[0],
            value: item[1],
          };
        }
      }) as Record<string, string>[];
    } catch (e) {
      console.log('Error getting items', keys, e);
    }
    return [];
  }

  async getRawStorageValue(key: string) {
    return AsyncStorage.getItem(key);
  }

  async getAllRawStorageKeyValues(): Promise<Record<string, any>[]> {
    const keys = await AsyncStorage.getAllKeys();
    return this.getRawStorageKeyValues(keys);
  }
  setRawStorageValue(key: string, value: any): Promise<void> {
    const rawValue = typeof value !== 'string' ? JSON.stringify(value) : value;
    return AsyncStorage.setItem(key, rawValue);
  }
  removeRawStorageValue(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  }
  removeAllRawStorageValues(): Promise<void> {
    return AsyncStorage.clear();
  }
  openDatabase(): Promise<{ isNewDatabase?: boolean | undefined } | undefined> {
    // TODO: check if items do not have to be redownloaded in case of a failure
    return Promise.resolve({ isNewDatabase: true });
  }

  async getAllRawDatabasePayloads(): Promise<any[]> {
    const keys = await this.getAllDatabaseKeys();
    const items = await this.getRawStorageKeyValues(keys);
    return items.map(item => JSON.parse(item.value));
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

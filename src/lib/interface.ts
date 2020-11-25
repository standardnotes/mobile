import AsyncStorage from '@react-native-community/async-storage';
import { ApplicationIdentifier, DeviceInterface } from '@standardnotes/snjs';
import { Alert, Linking, Platform } from 'react-native';
import FingerprintScanner from 'react-native-fingerprint-scanner';
import Keychain from './keychain';

export type BiometricsType =
  | 'Fingerprint'
  | 'Face ID'
  | 'Biometrics'
  | 'Touch ID';

/**
 * This identifier was the database name used in Standard Notes web/desktop.
 */
const LEGACY_IDENTIFIER = 'standardnotes';

/**
 * We use this function to decide if we need to prefix the identifier in getDatabaseKeyPrefix or not.
 * It is also used to decide if the raw or the namespaced keychain is used.
 * @param identifier The ApplicationIdentifier
 */
const isLegacyIdentifier = function (identifier: ApplicationIdentifier) {
  return identifier && identifier === LEGACY_IDENTIFIER;
};

const showLoadFailForItemIds = (failedItemIds: string[]) => {
  let text =
    'The following items could not be loaded. This may happen if you are in low-memory conditions, or if the note is very large in size. We recommend breaking up large notes into smaller chunks using the desktop or web app.\n\nItems:\n';
  let index = 0;
  text += failedItemIds.map(id => {
    let result = id;
    if (index !== failedItemIds.length - 1) {
      result += '\n';
    }
    index++;
    return result;
  });
  Alert.alert('Unable to load item(s)', text);
};

export class MobileDeviceInterface extends DeviceInterface {
  constructor() {
    super(setTimeout, setInterval);
  }

  deinit() {
    super.deinit();
  }

  legacy_setRawKeychainValue(value: any): Promise<void> {
    return Keychain.setKeys(value);
  }

  private getDatabaseKeyPrefix(identifier: ApplicationIdentifier) {
    if (identifier && !isLegacyIdentifier(identifier)) {
      return `${identifier}-Item-`;
    } else {
      return 'Item-';
    }
  }

  private keyForPayloadId(id: string, identifier: ApplicationIdentifier) {
    return `${this.getDatabaseKeyPrefix(identifier)}${id}`;
  }

  private async getAllDatabaseKeys(identifier: ApplicationIdentifier) {
    const keys = await AsyncStorage.getAllKeys();
    const filtered = keys.filter(key => {
      return key.includes(this.getDatabaseKeyPrefix(identifier));
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
      const failedItemIds: string[] = [];
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
          failedItemIds.push(key);
        }
      }
      if (failedItemIds.length > 0) {
        showLoadFailForItemIds(failedItemIds);
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
      try {
        return JSON.parse(item);
      } catch (e) {
        return item;
      }
    }
  }

  async getAllRawStorageKeyValues() {
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

  async getAllRawDatabasePayloads(
    identifier: ApplicationIdentifier
  ): Promise<unknown[]> {
    const keys = await this.getAllDatabaseKeys(identifier);
    return this.getDatabaseKeyValues(keys);
  }
  saveRawDatabasePayload(
    payload: any,
    identifier: ApplicationIdentifier
  ): Promise<void> {
    return this.saveRawDatabasePayloads([payload], identifier);
  }
  async saveRawDatabasePayloads(
    payloads: any[],
    identifier: ApplicationIdentifier
  ): Promise<void> {
    if (payloads.length === 0) {
      return;
    }
    await Promise.all(
      payloads.map(item => {
        return AsyncStorage.setItem(
          this.keyForPayloadId(item.uuid, identifier),
          JSON.stringify(item)
        );
      })
    );
  }
  removeRawDatabasePayloadWithId(
    id: string,
    identifier: ApplicationIdentifier
  ): Promise<void> {
    return this.removeRawStorageValue(this.keyForPayloadId(id, identifier));
  }
  async removeAllRawDatabasePayloads(
    identifier: ApplicationIdentifier
  ): Promise<void> {
    const keys = await this.getAllDatabaseKeys(identifier);
    return AsyncStorage.multiRemove(keys);
  }

  async getNamespacedKeychainValue(identifier: ApplicationIdentifier) {
    const keychain = await this.getRawKeychainValue();
    if (isLegacyIdentifier(identifier)) {
      return keychain;
    }
    if (!keychain) {
      return;
    }
    return (keychain as any)[identifier];
  }

  async setNamespacedKeychainValue(
    value: any,
    identifier: ApplicationIdentifier
  ) {
    if (isLegacyIdentifier(identifier)) {
      return Keychain.setKeys(value);
    }
    let keychain = await this.getRawKeychainValue();
    if (!keychain) {
      keychain = {};
    }
    return Keychain.setKeys({
      ...keychain,
      [identifier]: value,
    });
  }

  async clearNamespacedKeychainValue(identifier: ApplicationIdentifier) {
    if (isLegacyIdentifier(identifier)) {
      return this.clearRawKeychainValue();
    }
    const keychain = await this.getRawKeychainValue();
    if (!keychain) {
      return;
    }
    delete keychain[identifier];
    return Keychain.setKeys(keychain);
  }

  async getDeviceBiometricsAvailability() {
    try {
      await FingerprintScanner.isSensorAvailable();
      return true;
    } catch (e) {
      return false;
    }
  }

  getRawKeychainValue() {
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

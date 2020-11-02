import { Alert } from 'react-native';
import * as RCTKeychain from 'react-native-keychain';

type KeychainValue = Record<string, string>;

export default class Keychain {
  static async setKeys(keys: object) {
    const options = {
      /* iOS only */
      accessible: RCTKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    };
    return RCTKeychain.setGenericPassword(
      'sn',
      JSON.stringify(keys),
      options
    ).then(function () {
      console.log('Credentials saved successfully!');
    });
  }

  static async getKeys(): Promise<KeychainValue | undefined | null> {
    return RCTKeychain.getGenericPassword()
      .then(function (credentials) {
        if (!credentials || !credentials.password) {
          console.log('===Keychain value missing===');
          return null;
        } else {
          const keys = JSON.parse(credentials.password);
          return keys;
        }
      })
      .catch(function (error) {
        console.log(
          "Keychain couldn't be accessed! Maybe no value set?",
          error
        );
        Alert.alert(
          'Keychain failure',
          'Reading data from Keychain failed. Please try again and contact support if the problem persists.'
        );
        return undefined;
      });
  }

  static async clearKeys() {
    return RCTKeychain.resetGenericPassword().then(function () {
      console.log('Credentials successfully deleted');
    });
  }
}

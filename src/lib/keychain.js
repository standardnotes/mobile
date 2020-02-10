import * as RCTKeychain from 'react-native-keychain';

export default class Keychain {
  static async setKeys(keys) {
    const options = {
      /* iOS only */
      accessible: RCTKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    };
    return RCTKeychain.setGenericPassword(
      'sn',
      JSON.stringify(keys),
      options
    ).then(function() {
      console.log('Credentials saved successfully!');
    });
  }

  static async getKeys() {
    return RCTKeychain.getGenericPassword()
      .then(function(credentials) {
        if (!credentials || !credentials.password) {
          console.log('===Keychain value missing===');
          return null;
        } else {
          var keys = JSON.parse(credentials.password);
          return keys;
        }
      })
      .catch(function(error) {
        console.log(
          "Keychain couldn't be accessed! Maybe no value set?",
          error
        );
      });
  }

  static async clearKeys() {
    return RCTKeychain.resetGenericPassword().then(function() {
      console.log('Credentials successfully deleted');
    });
  }
}

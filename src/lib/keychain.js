import * as RCTKeychain from 'react-native-keychain';

export default class Keychain {

  static async setKeys(keys) {
    return RCTKeychain.setGenericPassword("sn", JSON.stringify(keys))
          .then(function() {
            console.log('Credentials saved successfully!');
          });
  }

  static async getKeys() {
    return RCTKeychain.getGenericPassword()
    .then(function(credentials) {
      console.log("Creds", credentials);
      if(!credentials || !credentials.password) {
        console.log("===Keychain value missing===");
        return null;
      } else {
        var keys = JSON.parse(credentials.password);
        console.log("keys", keys);
        return keys;
      }
    }).catch(function(error) {
      console.log('Keychain couldn\'t be accessed! Maybe no value set?', error);
    });
  }

  static async clearKeys() {
    return RCTKeychain
    .resetGenericPassword()
    .then(function() {
      console.log('Credentials successfully deleted');
    });
  }



}

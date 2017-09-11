import { NativeModules, Platform } from 'react-native';
var base64 = require('base-64');
var Aes = NativeModules.Aes;

export default class Crypto {

  static generateKeys(password, authParams, callback) {
    Aes.pbkdf2(password, authParams.pw_salt, authParams.pw_cost, 768).then(key => {

      var outputLength = key.length;
      var splitLength = outputLength/3;

      var pw = key.slice(0, splitLength);
      var mk = key.slice(splitLength, splitLength * 2);
      var ak = key.slice(splitLength * 2, splitLength * 3);

      callback({pw: pw, mk: mk, ak: ak})
    });
  }

  static async pbkdf2(password, salt, cost, length) {
    return Aes.pbkdf2(password, salt, cost, length).then(key => {
      return key;
    });
  }

  static async generateRandomKey(length) {
    return Aes.randomKey(length);
  }

  static async generateUUID() {
    return Aes.randomUuid();
  }

  static async decryptText({ciphertextToAuth, contentCiphertext, encryptionKey, iv, authHash, authKey} = {}, requiresAuth) {
    if(requiresAuth && !authHash) {
      console.log("Auth hash is required.");
      return;
    }

    if(authHash) {
      var localAuthHash = await Aes.hmac256(ciphertextToAuth, authKey);
      if(authHash !== localAuthHash) {
        console.log("Auth hash does not match, returning null.");
        return null;
      }
    }
    var decrypted = await Aes.decrypt(contentCiphertext, encryptionKey, iv);
    return decrypted;
  }

  static async encryptText(text, key, iv) {
    var encrypted = Aes.encrypt(text, key, iv);
    return encrypted;
  }

  static async generateRandomEncryptionKey() {
    return this.generateRandomKey(512/8);
  }

  static firstHalfOfKey(key) {
    return key.substring(0, key.length/2);
  }

  static secondHalfOfKey(key) {
    return key.substring(key.length/2, key.length);
  }

  static base64(text) {
    return base64.encode(text);
  }

  static base64Decode(base64String) {
    return base64.decode(base64String);
  }

  static async sha256(text) {
    return Aes.sha256(text);
  }

  static async hmac256(message, key) {
    return Aes.hmac256(message, key);
  }

}

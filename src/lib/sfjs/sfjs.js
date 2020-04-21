import { NativeModules } from 'react-native';
import { StandardFile, SFAbstractCrypto } from 'standard-file-js';

const base64 = require('base-64');
const Aes = NativeModules.Aes;

export default class SF extends StandardFile {
  static instance = null;
  static get() {
    if (this.instance == null) {
      // We don't want SFJS using this function, since we can only generate uuid async here.
      // SFJS will check to make sure `generateUUIDSync` is defined before using it.
      SFReactNativeCrypto.prototype.generateUUIDSync = null;
      let cryptoInstance = new SFReactNativeCrypto();
      this.instance = new SF(cryptoInstance);
    }
    return this.instance;
  }

  supportsPasswordDerivationCost(cost) {
    return true;
  }
}

class SFReactNativeCrypto extends SFAbstractCrypto {
  async generateUUID() {
    return Aes.randomUuid().then(uuid => {
      return uuid.toLowerCase();
    });
  }

  async encryptText(text, key, iv) {
    var encrypted = Aes.encrypt(text, key, iv);
    return encrypted;
  }

  async decryptText(
    {
      ciphertextToAuth,
      contentCiphertext,
      encryptionKey,
      iv,
      authHash,
      authKey,
    } = {},
    requiresAuth
  ) {
    if (requiresAuth && !authHash) {
      console.log('Auth hash is required.');
      return;
    }

    if (authHash) {
      var localAuthHash = await Aes.hmac256(ciphertextToAuth, authKey);
      if (authHash !== localAuthHash) {
        console.log('Auth hash does not match, returning null.');
        return null;
      }
    }
    var decrypted = await Aes.decrypt(contentCiphertext, encryptionKey, iv);
    return decrypted;
  }

  async pbkdf2(password, salt, cost, length) {
    return Aes.pbkdf2(password, salt, cost, length).then(key => {
      return key;
    });
  }

  async generateRandomKey(length) {
    return Aes.randomKey(length / 8);
  }

  async generateRandomEncryptionKey() {
    return this.generateRandomKey(512);
  }

  async base64(text) {
    return base64.encode(text);
  }

  async base64Decode(base64String) {
    return base64.decode(base64String);
  }

  async sha256(text) {
    return Aes.sha256(text);
  }

  async hmac256(message, key) {
    return Aes.hmac256(message, key);
  }
}

import Crypto from "./crypto"

export default class Encryptor {

 static async _private_encryptString(string, encryptionKey, authKey, uuid, version) {
    var fullCiphertext, contentCiphertext;
    if(version === "001") {
      contentCiphertext = await Crypto.encryptText(string, encryptionKey, null);
      fullCiphertext = version + contentCiphertext;
    } else {
      var iv = await Crypto.generateRandomKey(128/8);
      contentCiphertext = await Crypto.encryptText(string, encryptionKey, iv);
      var ciphertextToAuth = [version, uuid, iv, contentCiphertext].join(":");
      var authHash = await Crypto.hmac256(ciphertextToAuth, authKey);
      fullCiphertext = [version, authHash, uuid, iv, contentCiphertext].join(":");
    }

    return fullCiphertext;
  }

  static async encryptItem(item, keys, version) {
    var params = {};
    // encrypt item key
    var item_key = await Crypto.generateRandomEncryptionKey();
    if(version === "001") {
      // legacy
      params.enc_item_key = await Crypto.encryptText(item_key, keys.mk, null);
    } else {
      params.enc_item_key = await this._private_encryptString(item_key, keys.mk, keys.ak, item.uuid, version);
    }

    // encrypt content
    var ek = Crypto.firstHalfOfKey(item_key);
    var ak = Crypto.secondHalfOfKey(item_key);
    var ciphertext = await this._private_encryptString(JSON.stringify(item.createContentJSONFromProperties()), ek, ak, item.uuid, version);

    if(version === "001") {
      var authHash = await Crypto.hmac256(ciphertext, ak);
      params.auth_hash = authHash;
    }

    params.content = ciphertext;
    return params;
  }

  static encryptionComponentsFromString(string, encryptionKey, authKey) {
    var encryptionVersion = string.substring(0, 3);
    if(encryptionVersion === "001") {
      return {
        contentCiphertext: string.substring(3, string.length),
        encryptionVersion: encryptionVersion,
        ciphertextToAuth: string,
        iv: null,
        authHash: null,
        encryptionKey: encryptionKey,
        authKey: authKey
      }
    } else {
      let components = string.split(":");
      return {
        encryptionVersion: components[0],
        authHash: components[1],
        uuid: components[2],
        iv: components[3],
        contentCiphertext: components[4],
        ciphertextToAuth: [components[0], components[2], components[3], components[4]].join(":"),
        encryptionKey: encryptionKey,
        authKey: authKey
      }
    }
  }

  static async decryptItem(item, keys) {

    if((item.content.startsWith("001") || item.content.startsWith("002")) && item.enc_item_key) {
      // is encrypted, continue to below
    } else {
      // is base64 encoded
      item.content = Crypto.base64Decode(item.content.substring(3, item.content.length))
      return;
    }

    // decrypt encrypted key
    var encryptedItemKey = item.enc_item_key;
    var requiresAuth = true;
    if(encryptedItemKey.startsWith("002") === false) {
      // legacy encryption type, has no prefix
      encryptedItemKey = "001" + encryptedItemKey;
      requiresAuth = false;
    }
    var keyParams = this.encryptionComponentsFromString(encryptedItemKey, keys.mk, keys.ak);

    // return if uuid in auth hash does not match item uuid. Signs of tampering.
    if(keyParams.uuid && keyParams.uuid !== item.uuid) {
      item.errorDecrypting = true;
      return;
    }

    var item_key = await Crypto.decryptText(keyParams, requiresAuth);

    if(!item_key) {
      item.errorDecrypting = true;
      return;
    }

    // decrypt content
    var ek = Crypto.firstHalfOfKey(item_key);
    var ak = Crypto.secondHalfOfKey(item_key);
    var itemParams = this.encryptionComponentsFromString(item.content, ek, ak);

    // return if uuid in auth hash does not match item uuid. Signs of tampering.
    if(itemParams.uuid && itemParams.uuid !== item.uuid) {
      item.errorDecrypting = true;
      return;
    }

    if(!itemParams.authHash) {
      // legacy 001
      itemParams.authHash = item.auth_hash;
    }

    var content = await Crypto.decryptText(itemParams, true);
    if(!content) {
      item.errorDecrypting = true;
    } else {
      item.errorDecrypting = false;
    }
    item.content = content;
  }

  static async decryptMultipleItems(items, keys, throws) {
    for (var item of items) {
     if(item.deleted == true) {
       continue;
     }

     var isString = typeof item.content === 'string' || item.content instanceof String;
     if(isString) {
       try {
         await this.decryptItem(item, keys);
       } catch (e) {
         item.errorDecrypting = true;
         if(throws) {
           throw e;
         }
         console.log("Error decrypting item", item, e);
         continue;
       }
     }
   }
  }

}

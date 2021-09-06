/* eslint-disable no-bitwise */
import {
  Base64String,
  HexString,
  SNPureCrypto,
  timingSafeEqual,
  Utf8String,
} from '@standardnotes/sncrypto-common';
import Aes from 'react-native-aes-crypto';
import Sodium from 'react-native-sodium';

export class SNReactNativeCrypto implements SNPureCrypto {
  deinit(): void {}
  public timingSafeEqual(a: string, b: string) {
    return timingSafeEqual(a, b);
  }

  pbkdf2(
    password: Utf8String,
    salt: Utf8String,
    iterations: number,
    length: number
  ): Promise<string | null> {
    return Aes.pbkdf2(password, salt, iterations, length);
  }

  public async generateRandomKey(bits: number): Promise<string> {
    const bytes = bits / 8;
    const result = await Sodium.randombytes_buf(bytes);
    return result;
  }

  aes256CbcEncrypt(
    plaintext: Utf8String,
    iv: HexString,
    key: HexString
  ): Promise<Base64String> {
    return Aes.encrypt(plaintext, key, iv);
  }

  async aes256CbcDecrypt(
    ciphertext: Base64String,
    iv: HexString,
    key: HexString
  ): Promise<Utf8String | null> {
    try {
      return Aes.decrypt(ciphertext, key, iv);
    } catch (e) {
      return null;
    }
  }

  async hmac256(
    message: Utf8String,
    key: HexString
  ): Promise<HexString | null> {
    try {
      return Aes.hmac256(message, key);
    } catch (e) {
      return null;
    }
  }

  public async sha256(text: string): Promise<string> {
    return Aes.sha256(text);
  }

  public unsafeSha1(text: string): Promise<string> {
    return Aes.sha1(text);
  }

  public async argon2(
    password: Utf8String,
    salt: HexString,
    iterations: number,
    bytes: number,
    length: number
  ): Promise<HexString> {
    return Sodium.crypto_pwhash(
      length,
      password,
      salt,
      iterations,
      bytes,
      Sodium.crypto_pwhash_ALG_DEFAULT
    );
  }

  xchacha20Encrypt(
    plaintext: Utf8String,
    nonce: HexString,
    key: HexString,
    assocData: Utf8String
  ): Promise<Base64String> {
    return Sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintext,
      nonce,
      key,
      assocData
    );
  }

  public async xchacha20Decrypt(
    ciphertext: Base64String,
    nonce: HexString,
    key: HexString,
    assocData: Utf8String
  ): Promise<string | null> {
    try {
      const result = await Sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        ciphertext,
        nonce,
        key,
        assocData
      );
      return result;
    } catch (e) {
      return null;
    }
  }

  /**
   * Not implemented in SNReactNativeCrypto
   */
  public generateUUIDSync(): never {
    throw new Error('generateUUIDSync not implemented on mobile');
  }

  public async generateUUID() {
    const randomBuf = await Sodium.randombytes_buf(16);
    const tempBuf = new Uint8Array(randomBuf.length / 2);

    for (let i = 0; i < randomBuf.length; i += 2) {
      tempBuf[i / 2] = parseInt(randomBuf.substring(i, i + 2), 16);
    }

    const buf = new Uint32Array(tempBuf.buffer);
    let idx = -1;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        idx++;
        const r = (buf[idx >> 3] >> ((idx % 8) * 4)) & 15;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  public async base64Encode(text: Utf8String): Promise<string> {
    return Sodium.to_base64(text, Sodium.base64_variant_ORIGINAL);
  }

  public async base64Decode(base64String: Base64String): Promise<string> {
    return Sodium.from_base64(base64String, Sodium.base64_variant_ORIGINAL);
  }

  public hmac1(): Promise<HexString | null> {
    throw new Error('hmac1 is not implemented on mobile');
  }

  public generateOtpSecret(): Promise<string> {
    throw new Error('generateOtpSecret is not implemented on mobile');
  }

  public hotpToken(): Promise<string> {
    throw new Error('hotpToken is not implemented on mobile');
  }

  public totpToken(): Promise<string> {
    throw new Error('totpToken is not implemented on mobile');
  }
}

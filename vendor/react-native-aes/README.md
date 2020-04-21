# React Native AES

AES encryption/decryption for react-native

## Installation

```sh
npm install --save react-native-aes-crypto
```

or

```sh
yarn add react-native-aes-crypto
```

### Installation (iOS)

-   See [Linking Libraries](http://facebook.github.io/react-native/docs/linking-libraries-ios.html) OR
-   Drag RCTAes.xcodeproj to your project on Xcode.
-   Click on your main project file (the one that represents the .xcodeproj) select Build Phases and drag libRCTAes.a from the Products folder inside the RCTAes.xcodeproj.

### Installation (Android)

#### Untested!

```gradle
...
include ':react-native-aes-crypto'
project(':react-native-aes-crypto').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-aes-crypto/android')
```

-   In `android/app/build.gradle`

```gradle
...
dependencies {
    ...
    compile project(':react-native-aes-crypto')
}
```

-   register module (in MainApplication.java)

```java
......
import com.tectiv3.aes.RCTAesPackage;

......

@Override
protected List<ReactPackage> getPackages() {
   ......
   new RCTAesPackage(),
   ......
}
```

## Usage

### Example

```js
import { NativeModules, Platform } from 'react-native'
var Aes = NativeModules.Aes

const generateKey = (password, salt, cost, length) => Aes.pbkdf2(password, salt, cost, length)

const encrypt = (text, key) => {
    return Aes.randomKey(32).then(iv => {
        return Aes.encrypt(text, key, iv).then(cipher => ({
            cipher,
            iv,
        }))
    })
}

const decrypt = (encryptedData, key) => Aes.decrypt(encryptedData.cipher, key, encryptedData.iv)

try {
    generateKey('Arnold', 'salt', 5000, 512).then(key => {
        console.log('Key:', key)
        encrypt('These violent delights have violent ends', key)
            .then(({ cipher, iv }) => {
                console.log('Encrypted:', cipher)

                decrypt({ cipher, iv }, key)
                    .then(text => {
                        console.log('Decrypted:', text)
                    })
                    .catch(error => {
                        console.log(error)
                    })

                Aes.hmac256(cipher, key).then(hash => {
                    console.log('HMAC', hash)
                })
            })
            .catch(error => {
                console.log(error)
            })
    })
} catch (e) {
    console.error(e)
}
```

#### Or

```js
async function asyncDecrypt(cipher, key, iv) {
    try {
        var text = await decrypt({ cipher, iv }, key)
        console.log(text)
        return text
    } catch (e) {
        console.error(e)
    }
}
```

### methods

-   `encrypt(text, key, iv)`
-   `decrypt(base64, key, iv)`
-   `pbkdf2(text, salt, cost, length)`
-   `hmac256(cipher, key)`
-   `sha1(text)`
-   `sha256(text)`
-   `sha512(text)`
-   `randomUuid()`
-   `randomKey(length)`

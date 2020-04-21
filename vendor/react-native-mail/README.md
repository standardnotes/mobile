# react-native-mail

A React Native wrapper for Apple's ``MFMailComposeViewController`` from iOS and Mail Intent on android
Supports emails with attachments.

## Installation

There was a breaking change in RN >=40. So for React Native >= 0.40: use v3.x and higher of this lib. otherwise use v2.x

```bash
npm i --save react-native-mail # npm syntax
yarn add react-native-mail # yarn syntax
```

### Automatic Installation
You can automatically link the native components or follow the manual instructions below if you prefer.

 ```bash
 react-native link
 ```

### Manual Installation: Android

* In `android/setting.gradle`

```gradle
...
include ':RNMail', ':app'
project(':RNMail').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-mail/android')
```

* In `android/app/build.gradle`

```gradle
...
dependencies {
    ...
    compile project(':RNMail')
}
```

* if MainActivity extends Activity: register module in MainActivity.java


```java
import com.chirag.RNMail.*;  // <--- import

public class MainActivity extends Activity implements DefaultHardwareBackBtnHandler {
  ......

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    mReactRootView = new ReactRootView(this);

    mReactInstanceManager = ReactInstanceManager.builder()
      .setApplication(getApplication())
      .setBundleAssetName("index.android.bundle")
      .setJSMainModuleName("index.android")
      .addPackage(new MainReactPackage())
      .addPackage(new RNMail())              // <------ add here
      .setUseDeveloperSupport(BuildConfig.DEBUG)
      .setInitialLifecycleState(LifecycleState.RESUMED)
      .build();

    mReactRootView.startReactApplication(mReactInstanceManager, "ExampleRN", null);

    setContentView(mReactRootView);
  }

  ......

}
```
* else if MainActivity extends ReactActivity: register module in `MainApplication.java`

```java
import com.chirag.RNMail.*; // <--- import

public class MainApplication extends Application implements ReactApplication {
    ....

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
          new RNMail()      // <------ add here
      );
    }
  };

```



### Manual Installation: iOS

1. Run `npm install react-native-mail --save`
2. Open your project in XCode, right click on `Libraries` and click `Add
   Files to "Your Project Name"` [(Screenshot)](http://url.brentvatne.ca/jQp8) then navigate to node_modules/react-native-mail and select RNMail.xcodeproj [(Screenshot)](https://github.com/pedramsaleh/react-native-mail/blob/master/add-xcodeproj.png?raw=true).
3. Add `libRNMail.a` to `Build Phases -> Link Binary With Libraries`
   [(Screenshot)](http://url.brentvatne.ca/17Xfe).
4. Whenever you want to use it within React code now you can: `var Mailer = require('NativeModules').RNMail;`


## Example
```javascript
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import { View, Alert, Button } from 'react-native';
import Mailer from 'react-native-mail';

export default class App extends Component {

  handleEmail = () => {
    Mailer.mail({
      subject: 'need help',
      recipients: ['support@example.com'],
      ccRecipients: ['supportCC@example.com'],
      bccRecipients: ['supportBCC@example.com'],
      body: '<b>A Bold Body</b>',
      isHTML: true,
      attachment: {
        path: '',  // The absolute path of the file from which to read data.
        type: '',   // Mime Type: jpg, png, doc, ppt, html, pdf, csv
        name: '',   // Optional: Custom filename for attachment
      }
    }, (error, event) => {
      Alert.alert(
        error,
        event,
        [
          {text: 'Ok', onPress: () => console.log('OK: Email Error Response')},
          {text: 'Cancel', onPress: () => console.log('CANCEL: Email Error Response')}
        ],
        { cancelable: true }
      )
    });
  }

  render() {
    return (
      <View style={styles.container}>
        <Button
          onPress={this.handleEmail}
          title="Email Me"
          color="#841584"
          accessabilityLabel="Purple Email Me Button"
        />
      </View>
    );
  }
}


```

### Note

On Android, the `callback` will only be called if an `error` occurs. The `event` argument is unused!

## Here is how it looks:
![Demo gif](https://github.com/chirag04/react-native-mail/blob/master/screenshot.png)

# react-native-alternate-icons
React Native Alternate Icons for iOS 10.3+

![Demo](http://kamsteegsoftware.nl/react-native-alternate-icons/demo.gif)

## Requirements
* React Native 0.44+ (only tested on 0.44)

## Installation

```bash
npm install react-native-alternate-icons@latest --save
```

## Link the library to your React Native project

```bash
react-native link
```

#### Manual Linking

https://facebook.github.io/react-native/docs/linking-libraries-ios.html

## Preparation & Code Sample

### Preparation

#### Add your icons into your Xcode Project
![Icons in your Xcode Project](http://kamsteegsoftware.nl/react-native-alternate-icons/icons-project.png)

#### Add the following code to your info.plist
```xml
<key>supportsAlternateIcons</key>
<true/>
<key>CFBundleIcons</key>
<dict>
  <key>CFBundlePrimaryIcon</key>
  <dict>
    <key>CFBundleIconFiles</key>
    <array>
      <string>icon</string>
    </array>
    <key>UIPrerenderedIcon</key>
    <false/>
  </dict>
  <key>CFBundleAlternateIcons</key>
  <dict>
    <key>Red</key>
    <dict>
      <key>CFBundleIconFiles</key>
      <array>
        <string>Red</string>
      </array>
      <key>UIPrerenderedIcon</key>
      <false/>
    </dict>
  </dict>
</dict>
```

#### Using in your React Native applications
```javascript
import Icons from 'react-native-alternate-icons';

/** Change the icons of your application */
Icons.setIconName( iconName );
/** get Current Icon Name */
Icons.getIconName( callback( result ) );
/** Reset the icon of your application to the default */
Icons.reset();
/** Check if your device does support alternate icons, android returns always false */
Icons.supportDevice( callback( result ) );
```

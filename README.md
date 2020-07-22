# Standard Notes
## iOS & Android App

[Standard Notes](https://standardnotes.org) is a safe place for your notes, thoughts, and life's work. It focuses on being simple, so you don't have to fight with endless features that slow you down. It encrypts your notes to protect your privacy. And, it's extensible, so you can backup your notes to Dropbox, Google Drive, and other services, as well as install themes, editors, and more.

### Download Options:

- [iOS App Store](https://itunes.apple.com/us/app/standard-notes/id1285392450?mt=8) (iOS 9+)
- [Google Play](https://play.google.com/store/apps/details?id=com.standardnotes) (Android 5.0+)
- [F-Droid](https://f-droid.org/packages/com.standardnotes/) (Android 5.0+)
- [Direct APK](https://github.com/standardnotes/mobile/releases)

## The Code

This is a React Native implementation of Standard Notes. React Native allows us to build native mobile applications using JavaScript. This allows us to develop faster, as well as have a more reliable and consistent cross-platform experience.

### Building from source

1. Make sure you can run an example React Native project, setup your environment according to [official docs](https://reactnative.dev/docs/environment-setup)
2. If you would like to build an Android app, you need to install Android NDK. We use a native code from libsodium encryption library to ensure we archieve the best performance. You can install NDK in Android Studio, you need to pick version listed [here](https://github.com/standardnotes/react-native-sodium/blob/refactor/android/build.gradle#L47)
3. Install [yarn](https://yarnpkg.com/) if you don't have it already.
3. Install project dependencies

```shell
yarn run init
```

We have to flavours of the app:
* `dev` which runs connects to development syncing server. To run locally use `yarn ios-dev` or `yarn android-dev` for Android.
* `prod` which is an equivalent of a regular production app. To run locall use `yarn ios-prod` or `yarn android-prod` for Android.

If you would like to run on your iOS device, you need to do it using Xcode.

## Contributing
Before contributing, please read our [Longevity Statement](https://standardnotes.org/longevity) to better understand how we approach adding new features. Unlike other projects, adding new features is something we prefer *not* to do, so if you have a feature which you think is absolutely essential, please create a discussion issue first before coding.

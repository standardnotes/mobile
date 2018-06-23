# Standard Notes
## iOS & Android App

[Standard Notes](https://standardnotes.org) is a safe place for your notes, thoughts, and life's work. It focuses on being simple, so you don't have to fight with endless features that slow you down. It encrypts your notes to protect your privacy. And, it's extensible, so you can backup your notes to Dropbox, Google Drive, and other services, as well as install themes, editors, and more.

### Download Options:

- [iOS App Store](https://itunes.apple.com/us/app/standard-notes/id1285392450?mt=8) (iOS 8+)
- [Google Play](https://play.google.com/store/apps/details?id=com.standardnotes) (Android 5.0+)
- [Direct APK](https://github.com/standardnotes/mobile/releases)

## The Code

This is a React Native implementation of Standard Notes. React Native allows us to build native mobile applications using JavaScript. This allows us to develop faster, as well as have a more reliable and consistent cross-platform experience.

### Building the Project

Clone the project, then:

1. If you haven't arlready associated a SSH key with your github account, follow the directions on on https://help.github.com/articles/adding-a-new-ssh-key-to-your-github-account/ to do so.
2. `git submodule update --init`
3. `npm install`
4. `react-native run-ios` or `react-native run-android`

### Running on Device

- For iOS:
    Open the project in Xcode, then simply build and run with your device selected.
- For Android: connect your device, then simply run `react-native run-android`

### Generating an APK

```
cd android && ./gradlew assembleRelease
```

You'll then find the APK in this directory:
> android/app/build/outputs/apk/release

## Contributing
We love community contributions! Before contributing, please read our [Longevity Statement](https://standardnotes.org/longevity) to better understand how we approach adding new features. Unlike other projects, adding new features is something we prefer *not* to do, so if you have a feature which you think is absolutely essential, please create a discussion issue first before coding.

## Classic Codebase (Deprecated)

You can find the "classic" versions of our applications, which are built in Swift and Java/Kotlin, respectively, via these links:

1. [Swift-based iOS app](https://github.com/standardnotes/ios) (deprecated)
2. [Java/Kotlin based Android app](https://github.com/standardnotes/android) (deprecated)

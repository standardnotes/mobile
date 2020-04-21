# react-native-flag-secure-android
A simple module used to add FLAG_SECURE to the main activity. FLAG_SECURE prevents the users and the app to take screenshots of the app content. 

### Manual Install

1. Open up `android/app/src/main/java/[...]/MainApplication.java (React Native 0.29+)
  - Add `import com.kristiansorens.flagsecure.FlagSecurePackage;` to the imports at the top of the file
  - Add `new FlagSecurePackage()` to the list returned by the `getPackages()` method

3. Append the following lines to `android/settings.gradle`:

	```groovy
	include ':react-native-flag-secure-android'
	project(':react-native-flag-secure-android').projectDir = new File(rootProject.projectDir, 	'../node_modules/react-native-flag-secure-android/android')
	```

4. Insert the following lines inside the dependencies block in `android/app/build.gradle`:

	```groovy
  compile project(':react-native-flag-secure-android')
  ```

## Usage

```jsx

import FlagSecure from 'react-native-flag-secure-android';

function flagSecure(enable) {
  if (enable) {
    FlagSecure.activate();
  } else {
    FlagSecure.deactivate();
  }
}

```

## Notes
Please note that this module is an adpation of the [react-native-keep-awake](https://github.com/corbt/react-native-keep-awake) module.

import 'react-native-gesture-handler';
import Bugsnag from '@bugsnag/react-native';
import { enableScreens } from 'react-native-screens';

import { AppRegistry, YellowBox } from 'react-native';
import { App } from './src/App';
import { name as appName } from './app.json';
import { enableAndroidFontFix } from './src/style/android_text_fix';

require('react-native').unstable_enableLogBox();

YellowBox.ignoreWarnings([
  'The scalesPageToFit property is not supported when useWebKit = true', // we still want to use this property for Android
]);

enableScreens();

if (__DEV__ === false) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  // eslint-disable-next-line no-new
  new Bugsnag.start();
}

enableAndroidFontFix();

AppRegistry.registerComponent(appName, () => App);

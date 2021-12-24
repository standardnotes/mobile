import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import Bugsnag from '@bugsnag/react-native';
import { enableScreens } from 'react-native-screens';
import { SNLog } from '@standardnotes/snjs';

import { AppRegistry } from 'react-native';
import { App } from './src/App';
import { name as appName } from './app.json';
import { enableAndroidFontFix } from './src/style/android_text_fix';

enableScreens();

if (__DEV__ === false) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  SNLog.onError = Bugsnag.notify;
  SNLog.onLog = Bugsnag.leaveBreadcrumb;
} else {
  SNLog.onError = Bugsnag.notify;
  SNLog.onLog = Bugsnag.leaveBreadcrumb;
}

enableAndroidFontFix();

AppRegistry.registerComponent(appName, () => App);

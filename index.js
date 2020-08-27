import 'react-native-gesture-handler';
import Bugsnag from '@bugsnag/react-native';
import { enableScreens } from 'react-native-screens';

import { AppRegistry, YellowBox } from 'react-native';
import { App } from './src/App';
import { name as appName } from './app.json';
// TODO: this breaks typescript and has to be fixed
// import 'style/AndroidTextFix';

require('react-native').unstable_enableLogBox();

YellowBox.ignoreWarnings([
  'The scalesPageToFit property is not supported when useWebKit = true', // we still want to use this property for Android
]);

enableScreens();

if (__DEV__ === false) {
  // eslint-disable-next-line no-new
  new Bugsnag.start();
}

AppRegistry.registerComponent(appName, () => App);

import './src/global';
import 'react-native-gesture-handler';

import { AppRegistry, YellowBox } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
// import 'style/AndroidTextFix';
import { SFItem } from 'snjs';

SFItem.AppDomain = 'org.standardnotes.sn';

require('react-native').unstable_enableLogBox();

YellowBox.ignoreWarnings([
  'The scalesPageToFit property is not supported when useWebKit = true', // we still want to use this property for Android
  'Remote debugger is in',
  "Can't call", // Can't call forceUpdate on a component that is not yet mounted.
]);

AppRegistry.registerComponent(appName, () => App);

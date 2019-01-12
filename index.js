import './src/global.js'

import {AppRegistry, YellowBox} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

YellowBox.ignoreWarnings([
  'Remote debugger is in',
  "Can't call" // Can't call forceUpdate on a component that is not yet mounted.
]);

AppRegistry.registerComponent(appName, () => App);

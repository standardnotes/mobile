import './src/global.js'

import {AppRegistry, YellowBox} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

YellowBox.ignoreWarnings([
  'Remote debugger is in',
]);

AppRegistry.registerComponent(appName, () => App);

import { Platform, NativeModules } from 'react-native';

// moment.js
let moment = require('moment/min/moment-with-locales.min.js');
let locale = Platform.OS === 'android' ? NativeModules.I18nManager.localeIdentifier : NativeModules.SettingsManager.settings.AppleLocale
moment.locale(locale);

export default moment;

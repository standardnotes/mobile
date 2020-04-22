import { Platform, NativeModules } from 'react-native';

// moment.js
const moment = require('moment/min/moment-with-locales.min.js');
const locale =
  Platform.OS === 'android'
    ? NativeModules.I18nManager.localeIdentifier
    : NativeModules.SettingsManager.settings.AppleLocale;
moment.locale(locale);

export default moment;

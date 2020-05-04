import { Platform, NativeModules } from 'react-native';

// moment.js
import moment from 'moment';
const locale =
  Platform.OS === 'android'
    ? NativeModules.I18nManager.localeIdentifier
    : NativeModules.SettingsManager.settings.AppleLocale;
moment.locale(locale);

export default moment;

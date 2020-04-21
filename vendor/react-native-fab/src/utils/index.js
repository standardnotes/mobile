import { Platform } from 'react-native';

const {
  Version,
  OS,
} = Platform;

export const IS_ANDROID = OS === 'android';
export const IS_LT_LOLLIPOP = Version < 21;
export const noop = () => {};

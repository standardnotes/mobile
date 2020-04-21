import {NativeModules} from 'react-native';

var SNReactNative = {
  exitApp: function() {
    NativeModules.SNReactNative.exitApp();
  }
};

export default SNReactNative;

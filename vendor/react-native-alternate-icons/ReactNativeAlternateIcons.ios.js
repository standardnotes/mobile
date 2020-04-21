/**
 * @providesModule ReactNativeAlternateIcons
 * @flow
 */
'use strict';

import { NativeModules } from 'react-native';
var NativeReactNativeAlternateIcons = NativeModules.ReactNativeAlternateIcons;

/**
 * High-level docs for the ReactNativeAlternateIcons iOS API can be written here.
 */

var ReactNativeAlternateIcons = {
    setIconName( name ) {
        NativeReactNativeAlternateIcons.setIconName( name );
    },
    reset() {
        NativeReactNativeAlternateIcons.reset();
    },
    getIconName( callback ){
        NativeReactNativeAlternateIcons.getIconName( ( result ) =>{
            callback( result.iconName );
        });
    },
    supportDevice( callback ){
        NativeReactNativeAlternateIcons.supportDevice( ( result ) => {
            callback( result.supported );
        });
    }
};

module.exports = ReactNativeAlternateIcons;

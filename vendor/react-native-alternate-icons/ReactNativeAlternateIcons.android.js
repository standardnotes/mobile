/**
 * Stub of ReactNativeAlternateIcons for Android.
 *
 * @providesModule ReactNativeAlternateIcons
 * @flow
 */
'use strict';

var warning = require('fbjs/lib/warning');

var ReactNativeAlternateIcons = {
  	setIconName: function( name ) {
    	warning('Not yet implemented for Android.');
  	},
  	reset: function() {
    	warning('Not yet implemented for Android.');
  	},
	getIconName: function(){
		warning('Not yet implemented for Android.');
	},
	supportDevice: function( callback ){
		callback( false );
	}
};

module.exports = ReactNativeAlternateIcons;

/**
 * @providesModule SNTextView
 * @flow
 */
'use strict';

var NativeSNTextView = require('NativeModules').SNTextView;

/**
 * High-level docs for the SNTextView iOS API can be written here.
 */

var SNTextView = {
  test: function() {
    NativeSNTextView.test();
  }
};

module.exports = SNTextView;

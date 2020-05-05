// Apparently Android doesn't support symbols.
// https://github.com/facebook/react-native/issues/15902

// Also note, there seems to be an issue with running Android with Chrome debugging enabled.
// The app will hang, and even simple things like setTimeout => console.log("hi") won't work.
// Might be because of a new Chrome version with an old RN version.
// global.Symbol = require('core-js/es6/symbol');
// require('core-js/fn/symbol/iterator');

// // collection fn polyfills
// require('core-js/fn/map');
// require('core-js/fn/set');
// require('core-js/fn/array/find');

// TODO: still crashes without this
// @ts-ignore
global._ = require('lodash');

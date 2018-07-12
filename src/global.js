// Apparently Android doesn't support symbols.
// https://github.com/facebook/react-native/issues/15902
// symbol polyfills
global.Symbol = require('core-js/es6/symbol');
require('core-js/fn/symbol/iterator');

// collection fn polyfills
require('core-js/fn/map');
require('core-js/fn/set');
require('core-js/fn/array/find');

global._ = require('lodash');

import {
  SFItem,
  SFModelManager,
  SFSyncManager,
  SFItemParams,
  SFAlertManager,
  SFStorageManager,
  SFHttpManager,
  SFAuthManager
} from 'standard-file-js';

global.SFItem = SFItem;
global.SFItemParams = SFItemParams;
global.SFModelManager = SFModelManager;
global.SFSyncManager = SFSyncManager;
global.SFAlertManager = SFAlertManager;
global.SFStorageManager = SFStorageManager;
global.SFHttpManager = SFHttpManager;
global.SFAuthManager = SFAuthManager;

import SF from "./lib/sfjs/sfjs"
global.SFJS = SF.get();

import {
  SNNote,
  SNTag,
  SNTheme,
  SNComponent
} from 'sn-models';

global.SNNote = SNNote;
global.SNTag = SNTag;
global.SNTheme = SNTheme;
global.SNComponent = SNComponent;

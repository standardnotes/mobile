// Apparently Android doesn't support symbols.
// https://github.com/facebook/react-native/issues/15902

// Also note, there seems to be an issue with running Android with Chrome debugging enabled.
// The app will hang, and even simple things like setTimeout => console.log("hi") won't work.
// Might be because of a new Chrome version with an old RN version.
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
  SFAuthManager,
  SFPrivilegesManager
} from 'standard-file-js';

SFItem.AppDomain = 'org.standardnotes.sn';

global.SFItem = SFItem;
global.SFItemParams = SFItemParams;
global.SFModelManager = SFModelManager;
global.SFSyncManager = SFSyncManager;
global.SFAlertManager = SFAlertManager;
global.SFStorageManager = SFStorageManager;
global.SFHttpManager = SFHttpManager;
global.SFAuthManager = SFAuthManager;
global.SFPrivilegesManager = SFPrivilegesManager;

import SF from './lib/sfjs/sfjs';
global.SFJS = SF.get();

import { SNNote, SNTag, SNTheme, SNComponent, SNComponentManager } from 'snjs';

global.SNNote = SNNote;
global.SNTag = SNTag;
global.SNTheme = SNTheme;
global.SNComponent = SNComponent;
global.SNComponentManager = SNComponentManager;

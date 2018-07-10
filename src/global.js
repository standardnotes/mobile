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

import 'sn-models';

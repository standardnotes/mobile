import Crypto from './crypto'
import Server from './server'
import Auth from './auth'
import ModelManager from './modelManager'
import DBManager from './dbManager'
import Storage from './storage'
import Encryptor from './encryptor'
import KeysManager from './keysManager'

import Item from "../models/api/item"
import ItemParams from "../models/local/itemParams"

var _ = require('lodash')

export default class Sync {

  static instance = null;

  static getInstance() {
    if (this.instance == null) {
      this.instance = new Sync();
    }

    return this.instance;
  }

  constructor() {
    this.syncStatus = {};
    this.syncObservers = [];
    this.dataLoadObservers = [];
    KeysManager.get().registerAccountRelatedStorageKeys(["syncToken", "cursorToken"]);
  }

  registerSyncObserver(callback) {
    var observer = {key: new Date(), callback: callback};
    this.syncObservers.push(observer);
    return observer;
  }

  removeSyncObserver(observer) {
    _.pull(this.syncObservers, observer);
  }

  registerInitialDataLoadObserver(callback) {
    var observer = {key: new Date(), callback: callback};
    this.dataLoadObservers.push(observer);
    if(this.dataLoaded) {
      callback();
    }
    return observer;
  }

  removeDataLoadObserver(observer) {
    _.pull(this.dataLoadObservers, observer);
  }

  async loadLocalItems(callback) {
    return DBManager.getAllItems(function(items){
      this.handleItemsResponse(items, null).then(function(mappedItems){
        Item.sortItemsByDate(mappedItems);

        this.dataLoaded = true;

        console.log("Sync: Local Data Loaded");

        this.dataLoadObservers.forEach(function(observer){
          observer.callback();
        })

        callback(mappedItems);
      }.bind(this))

    }.bind(this))
  }

  syncOffline(items, callback) {
    this.writeItemsToStorage(items, true, function(responseItems){
      // delete anything needing to be deleted
      for(var item of items) {
        if(item.deleted) {
            ModelManager.getInstance().removeItemLocally(item);
        }
      }

      this.syncObservers.forEach(function(mapping){
        var changesMade = true;
        mapping.callback(changesMade);
      })

      if(callback) {
        callback({success: true});
      }
    }.bind(this))
  }

  async writeItemsToStorage(items, offlineOnly, callback) {
    var version = Auth.getInstance().protocolVersion();
    var params = [];

    for(var item of items) {
      var itemParams = new ItemParams(item, KeysManager.get().activeKeys(), version);
      itemParams = await itemParams.paramsForLocalStorage();
      if(offlineOnly) {
        delete itemParams.dirty;
      }
      params.push(itemParams);
    }

    DBManager.saveItems(params, callback);
  }

  markAllItemsDirtyAndSaveOffline(callback) {
    var items = ModelManager.getInstance().allItems;
    for(var item of items) {
      item.setDirty(true);
    }
    this.writeItemsToStorage(items, false, callback);
  }

  async setSyncToken(token) {
    this._syncToken = token;
    return await Storage.setItem("syncToken", token);
  }

  async getSyncToken() {
    if(!this._syncToken) {
      this._syncToken = await Storage.getItem("syncToken");
    }
    return this._syncToken;
  }

  async setCursorToken(token) {
    this._cursorToken = token;
    if(token) {
      return await Storage.setItem("cursorToken", token);
    } else {
      return await Storage.removeItem("cursorToken");
    }
  }

  async getCursorToken() {
    if(!this._cursorToken) {
      this._cursorToken = await Storage.getItem("cursorToken");
    }
    return this._cursorToken;
  }

  get queuedCallbacks() {
    if(!this._queuedCallbacks) {
      this._queuedCallbacks = [];
    }
    return this._queuedCallbacks;
  }

  clearQueuedCallbacks() {
    this._queuedCallbacks = [];
  }

  callQueuedCallbacksAndCurrent(currentCallback, response) {
    var allCallbacks = this.queuedCallbacks;
    if(currentCallback) {
      allCallbacks.push(currentCallback);
    }
    if(allCallbacks.length) {
      for(var eachCallback of allCallbacks) {
        eachCallback(response);
      }
      this.clearQueuedCallbacks();
    }
  }

  beginCheckingIfSyncIsTakingTooLong() {
    this.syncStatus.checker = setInterval(function(){
      // check to see if the ongoing sync is taking too long, alert the user
      var secondsPassed = (new Date() - this.syncStatus.syncStart) / 1000;
      var warningThreshold = 5; // seconds
      if(secondsPassed > warningThreshold) {
        // this.$rootScope.$broadcast("sync:taking-too-long");
        this.stopCheckingIfSyncIsTakingTooLong();
      }
    }.bind(this), 500)
  }

  stopCheckingIfSyncIsTakingTooLong() {
    clearInterval(this.syncStatus.checker);
  }

  async sync(callback, options = {}) {

    var allDirtyItems = ModelManager.getInstance().getDirtyItems();

    if(this.syncStatus.syncOpInProgress) {
      this.repeatOnCompletion = true;
      if(callback) {
        this.queuedCallbacks.push(callback);
      }

      // write to local storage nonetheless, since some users may see several second delay in server response.
      // if they close the browser before the ongoing sync request completes, local changes will be lost if we dont save here
      this.writeItemsToStorage(allDirtyItems, false, null);

      console.log("Sync op in progress; returning.");
      return;
    }


    // we want to write all dirty items to disk only if the user is offline, or if the sync op fails
    // if the sync op succeeds, these items will be written to disk by handling the "saved_items" response from the server
    if(Auth.getInstance().offline()) {
      console.log("Sync: offline, returning.");
      this.syncOffline(allDirtyItems, callback);
      ModelManager.getInstance().clearDirtyItems(allDirtyItems);
      return;
    }

    var isContinuationSync = this.syncStatus.needsMoreSync;

    this.syncStatus.syncOpInProgress = true;
    this.syncStatus.syncStart = new Date();
    this.beginCheckingIfSyncIsTakingTooLong();

    let submitLimit = 100;
    var subItems = allDirtyItems.slice(0, submitLimit);
    if(subItems.length < allDirtyItems.length) {
      // more items left to be synced, repeat
      this.syncStatus.needsMoreSync = true;
    } else {
      this.syncStatus.needsMoreSync = false;
    }

    if(!isContinuationSync) {
      this.syncStatus.total = allDirtyItems.length;
      this.syncStatus.current = 0;
    }

    // when doing a sync request that returns items greater than the limit, and thus subsequent syncs are required,
    // we want to keep track of all retreived items, then save to local storage only once all items have been retrieved,
    // so that relationships remain intact
    if(!this.allRetreivedItems) {
      this.allRetreivedItems = [];
    }


    var params = {};
    params.limit = 150;
    params.items = [];

    if(subItems.length > 0) {
      var version = Auth.getInstance().protocolVersion();
      var keys = KeysManager.get().activeKeys();

      for(var item of subItems) {
        if(!item.uuid) {
          console.error("Item doesn't have uuid!", item);
          return;
        }
        var itemParams = new ItemParams(item, keys, version);
        itemParams.additionalFields = options.additionalFields;
        var result = await itemParams.paramsForSync();
        params.items.push(result);
      }
    }

    params.sync_token = await this.getSyncToken();
    params.cursor_token = await this.getCursorToken();

    var onSyncCompletion = async function(response) {
      this.stopCheckingIfSyncIsTakingTooLong();
    }.bind(this);

    var onSyncSuccess = async function(response) {
      console.log("Sync completed.");
      ModelManager.getInstance().clearDirtyItems(subItems);
      this.syncStatus.error = null;

      // this.$rootScope.$broadcast("sync:updated_token", this.syncToken);

      var retrieved = await this.handleItemsResponse(response.retrieved_items, null);
      this.allRetreivedItems = this.allRetreivedItems.concat(retrieved);

      // merge only metadata for saved items
      // we write saved items to disk now because it clears their dirty status then saves
      // if we saved items before completion, we had have to save them as dirty and save them again on success as clean
      var omitFields = ["content", "auth_hash"];
      var saved = await this.handleItemsResponse(response.saved_items, omitFields);

      await this.handleUnsavedItemsResponse(response.unsaved)
      this.writeItemsToStorage(saved, false, null);

      this.syncStatus.syncOpInProgress = false;
      this.syncStatus.current += subItems.length;

      // set the sync token at the end, so that if any errors happen above, you can resync
      this.setSyncToken(response.sync_token);
      this.setCursorToken(response.cursor_token);

      onSyncCompletion(response);

      if(await this.getCursorToken() || this.syncStatus.needsMoreSync) {
        setTimeout(function () {
          this.sync(callback, options);
        }.bind(this), 10); // wait 10ms to allow UI to update
      } else if(this.repeatOnCompletion) {
        this.repeatOnCompletion = false;
        setTimeout(function () {
          this.sync(callback, options);
        }.bind(this), 10); // wait 10ms to allow UI to update
      } else {
        this.writeItemsToStorage(this.allRetreivedItems, false, null);
        this.allRetreivedItems = [];

        this.callQueuedCallbacksAndCurrent(callback, response);

        this.syncObservers.forEach(function(mapping){
          var changesMade = retrieved.length > 0 || response.unsaved.length > 0;
          mapping.callback(changesMade);
        })
      }
    }.bind(this);

    try {
      var url = Auth.getInstance().urlForPath("items/sync");
      Server.getInstance().postAbsolute(url, params, function(response){

        try {
          onSyncSuccess(response);
        } catch(e) {
          console.log("Caught sync success exception:", e);
        }

      }.bind(this), function(response){
        console.log("Sync error: ", response);
        var error = response ? response.error : {message: "Could not connect to server."};

        this.syncStatus.syncOpInProgress = false;
        this.syncStatus.error = error;
        this.writeItemsToStorage(allDirtyItems, false, null);

        onSyncCompletion(response);

        // this.$rootScope.$broadcast("sync:error", error);

        this.callQueuedCallbacksAndCurrent(callback, {error: "Sync error"});
      }.bind(this));
    }
    catch(e) {
      console.log("Sync exception caught:", e);
    }
  }

  async handleItemsResponse(responseItems, omitFields) {
    var keys = KeysManager.get().activeKeys();
    await Encryptor.decryptMultipleItems(responseItems, keys);
    var items = ModelManager.getInstance().mapResponseItemsToLocalModelsOmittingFields(responseItems, omitFields);
    return items;
  }

  async handleUnsavedItemsResponse(unsaved) {
    if(unsaved.length == 0) {
      return;
    }

    console.log("Handle unsaved", unsaved);

    var items = unsaved.map(function(mapping){
      return mapping.item;
    })

    await Encryptor.decryptMultipleItems(items, KeysManager.get().activeKeys());

    for(var mapping of unsaved) {
      var itemResponse = mapping.item;
      var error = mapping.error;
      var item = ModelManager.getInstance().findItem(itemResponse.uuid);
      if(!item) {
        // could be deleted
        continue;
      }

      if(error.tag == "uuid_conflict") {
        // uuid conflicts can occur if a user attempts to import an old data archive with uuids from the old account into a new account
        await ModelManager.getInstance().alternateUUIDForItem(item);
      } else if(error.tag === "sync_conflict") {
        // create a new item with the same contents of this item if the contents differ
        itemResponse.uuid = null; // we want a new uuid for the new item
        var dup = ModelManager.getInstance().createItem(itemResponse);
        if(!itemResponse.deleted && JSON.stringify(item.structureParams()) !== JSON.stringify(dup.structureParams())) {
          await dup.initUUID();
          ModelManager.getInstance().addItem(dup);
          dup.conflictOf = item.uuid;
          dup.setDirty(true);
        }
      }
    }

    this.sync(null, {additionalFields: ["created_at", "updated_at"]});
  }

  async clearSyncToken() {
    return Storage.removeItem("syncToken");
  }

  handleSignout(callback) {
    this._syncToken = null;
    this._cursorToken = null;
    this._queuedCallbacks = [];
    this.syncStatus = {};
    this.syncObservers.forEach(function(mapping){
      mapping.callback();
    })
  }
}

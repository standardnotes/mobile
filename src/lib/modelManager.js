import Crypto from "./crypto"
import DBManager from "./dbManager"
var _ = require('lodash')

import Item from "../models/api/item"
import Note from "../models/app/note"
import Tag from "../models/app/tag"
import Theme from "../models/app/theme"

export default class ModelManager {

  static instance = null;

  static getInstance() {
    if (this.instance == null) {
      this.instance = new ModelManager();
    }

    return this.instance;
  }

  constructor() {
    this.items = [];
    this.notes = [];
    this.tags = [];
    this.themes = [];
    this.itemsPendingRemoval = [];
    this.itemSyncObservers = [];

    this.acceptableContentTypes = ["Note", "Tag", "SN|Theme"];
  }

  handleSignout() {
    // empty the following arrays by settings its length to 0
    this.notes.length = 0;
    this.tags.length = 0;
    this.themes.length = 0;
    this.items.length = 0;
  }

  get allItems() {
    return this.items.filter(function(item){
      return !item.dummy;
    })
  }

  async alternateUUIDForItem(item) {
    // we need to clone this item and give it a new uuid, then delete item with old uuid from db (you can't mofidy uuid's in our indexeddb setup)
    var newItem = this.createItem(item);
    newItem.uuid = await Crypto.generateUUID();
    newItem.informReferencesOfUUIDChange(item.uuid, newItem.uuid);
    this.informModelsOfUUIDChangeForItem(newItem, item.uuid, newItem.uuid);
    return this.removeItemLocally(item).then(function(){
      this.addItem(newItem);
      newItem.setDirty(true);
      newItem.markAllReferencesDirty();
    }.bind(this))
  }

  informModelsOfUUIDChangeForItem(newItem, oldUUID, newUUID) {
    // some models that only have one-way relationships might be interested to hear that an item has changed its uuid
    // for example, editors have a one way relationship with notes. When a note changes its UUID, it has no way to inform the editor
    // to update its relationships

    for(var model of this.items) {
      model.potentialItemOfInterestHasChangedItsUUID(newItem, oldUUID, newUUID);
    }
  }

  allItemsMatchingTypes(contentTypes) {
    return this.items.filter(function(item){
      return (_.includes(contentTypes, item.content_type) || _.includes(contentTypes, "*")) && !item.dummy;
    })
  }

  findItem(itemId) {
    return _.find(this.items, {uuid: itemId});
  }

  getItemsWithIds(ids) {
    return this.items.filter(function(item){
      return ids.includes(item.uuid);
    })
  }

  findOrCreateTagByTitle(title) {
    var tag = _.find(this.tags, {title: title})
    if(!tag) {
      tag = this.createItem({content_type: "Tag", title: title});
      this.addItem(tag);
    }
    return tag;
  }

  mapResponseItemsToLocalModels(items) {
    return this.mapResponseItemsToLocalModelsOmittingFields(items, null);
  }

  mapResponseItemsToLocalModelsOmittingFields(items, omitFields) {
    var models = [], processedObjects = [], modelsToNotifyObserversOf = [];

    // first loop should add and process items
    for (var json_obj of items) {
      if((!json_obj.content_type || !json_obj.content) && !json_obj.deleted) {
        // An item that is not deleted should never have empty content
        console.log("Server response item is corrupt:", json_obj);
        continue;
      }

      json_obj = _.omit(json_obj, omitFields || [])
      var item = this.findItem(json_obj.uuid);

      if(item) {
        item.updateFromJSON(json_obj);
      }

      if(this.itemsPendingRemoval.includes(json_obj.uuid)) {
        _.pull(this.itemsPendingRemoval, json_obj.uuid);
        continue;
      }

      var unknownContentType = !_.includes(this.acceptableContentTypes, json_obj["content_type"]);
      if(json_obj.deleted == true || unknownContentType) {
        if(item && !unknownContentType) {
          modelsToNotifyObserversOf.push(item);
          this.removeItemLocally(item)
        }
        continue;
      }

      if(!item) {
        item = this.createItem(json_obj);
      }

      this.addItem(item);

      modelsToNotifyObserversOf.push(item);
      models.push(item);
      processedObjects.push(json_obj);
    }

    // second loop should process references
    for (var index in processedObjects) {
      var json_obj = processedObjects[index];
      if(json_obj.content) {
        this.resolveReferencesForItem(models[index]);
      }
    }

    this.notifySyncObserversOfModels(modelsToNotifyObserversOf);

    return models;
  }

  notifySyncObserversOfModels(models) {
    for(var observer of this.itemSyncObservers) {
      var relevantItems = models.filter(function(item){return item.content_type == observer.type || observer.type == "*"});
      if(relevantItems.length > 0) {
        observer.callback(relevantItems);
      }
    }
  }

  createItem(json_obj) {
    var item;
    if(json_obj.content_type == "Note") {
      item = new Note(json_obj);
    } else if(json_obj.content_type == "Tag") {
      item = new Tag(json_obj);
    } else if(json_obj.content_type == "SN|Theme") {
      item = new Theme(json_obj);
    }

    else {
      item = new Item(json_obj);
    }

    return item;
  }

  addItems(items) {
    items.forEach(function(item) {
      if(item.content_type == "Tag") {
        if(!_.find(this.tags, {uuid: item.uuid})) {
          this.tags.splice(_.sortedIndexBy(this.tags, item, function(item){
            if (item.title) return item.title.toLowerCase();
            else return ''
          }), 0, item);
        }
      } else if(item.content_type == "Note") {
        if(!_.find(this.notes, {uuid: item.uuid})) {
          this.notes.unshift(item);
        }
      } else if(item.content_type == "SN|Theme") {
       if(!_.find(this.themes, {uuid: item.uuid})) {
         this.themes.unshift(item);
       }
     }

     if(!_.find(this.items, {uuid: item.uuid})) {
       this.items.push(item);
     }
    }.bind(this));
  }

  addItem(item) {
    this.addItems([item]);
  }

  createDuplicateItem(itemResponse) {
    var dup = this.createItem(itemResponse);
    this.resolveReferencesForItem(dup);
    return dup;
  }

  itemsForContentType(contentType) {
    return this.items.filter(function(item){
      return item.content_type == contentType;
    });
  }

  resolveReferencesForItem(item) {

    var contentObject = item.contentObject;

    // If another client removes an item's references, this client won't pick up the removal unless
    // we remove everything not present in the current list of references
    item.removeReferencesNotPresentIn(contentObject.references || []);

    if(!contentObject.references) {
      return;
    }

    for(var reference of contentObject.references) {
      var referencedItem = this.findItem(reference.uuid);
      if(referencedItem) {
        item.addItemAsRelationship(referencedItem);
        referencedItem.addItemAsRelationship(item);
      } else {
        // console.error("Unable to find reference:", reference.uuid, "for item:", item);
      }
    }
  }

  addItemSyncObserver(id, type, callback) {
    this.itemSyncObservers.push({id: id, type: type, callback: callback});
  }

  removeItemSyncObserver(id) {
    _.remove(this.itemSyncObservers, _.find(this.itemSyncObservers, {id: id}));
  }

  get filteredNotes() {
    return Note.filterDummyNotes(this.notes);
  }

  getDirtyItems() {
    // Items that have errorDecrypting should never be synced back up to the server
    return this.items.filter(function(item){return item.dirty == true && !item.dummy && !item.errorDecrypting})
  }

  clearDirtyItems(items) {
    for(var item of items) {
      item.setDirty(false);
    }
  }

  clearAllDirtyItems() {
    this.clearDirtyItems(this.getDirtyItems());
  }

  setItemToBeDeleted(item) {
    item.deleted = true;
    if(!item.dummy) {
      item.setDirty(true);
    }
    item.removeAndDirtyAllRelationships();
  }

  async removeItemLocally(item) {
    _.pull(this.items, item);

    this.itemsPendingRemoval.push(item.uuid);

    item.isBeingRemovedLocally();

    if(item.content_type == "Tag") {
      _.pull(this.tags, item);
    } else if(item.content_type == "Note") {
      this.notes = _.pull(this.notes, item);
    } else if(item.content_type == "SN|Theme") {
      _.pull(this.themes, item);
    }

    return DBManager.deleteItem(item);
  }

  getNotes(options = {}) {
    var notes;
    var tags = [];
    if(options.selectedTags && options.selectedTags.length > 0 && options.selectedTags[0].key !== "all") {
      tags = ModelManager.getInstance().getItemsWithIds(options.selectedTags);
      if(tags.length > 0) {
        var taggedNotes = new Set();
        for(var tag of tags) {
          taggedNotes = new Set([...taggedNotes, ...new Set(tag.notes)])
        }
        notes = Array.from(taggedNotes);
      }
    }

    if(!notes) {
      notes = this.notes;
    }

    var searchTerm = options.searchTerm;
    if(searchTerm) {
      searchTerm = searchTerm.toLowerCase();
      notes = notes.filter(function(note){
        return note.safeTitle().toLowerCase().includes(searchTerm) || note.safeText().toLowerCase().includes(searchTerm);
      })
    }

    var sortBy = options.sortBy;

    notes = notes.filter(function(note){
      if(note.deleted) {
        return false;
      }
      if(options.archivedOnly) {
        return note.archived;
      } else {
        return !note.archived;
      }
    })

    let sortValueFn = (a, b, pinCheck = false) => {
      if(!pinCheck) {
        if(a.pinned && b.pinned) {
          return sortValueFn(a, b, true);
        }
        if(a.pinned) { return -1; }
        if(b.pinned) { return 1; }
      }

      var aValue = a[sortBy] || "";
      var bValue = b[sortBy] || "";

      let vector = 1;
      if(sortBy == "title") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();

        if(aValue.length == 0 && bValue.length == 0) {
          return 0;
        } else if(aValue.length == 0 && bValue.length != 0) {
          return 1;
        } else if(aValue.length != 0 && bValue.length == 0) {
          return -1;
        } else  {
          vector = -1;
        }
      }

      if(aValue > bValue) { return -1 * vector;}
      else if(aValue < bValue) { return 1 * vector;}
      return 0;
    }

    notes = notes.sort(function(a, b){
      return sortValueFn(a, b);
    })

    return {notes: notes, tags: tags};
  }
}

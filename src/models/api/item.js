import Crypto from "../../lib/crypto"
import {moment} from "../../app"

var _ = require('lodash')

let AppDomain = "org.standardnotes.sn";

export default class Item {

  constructor(json_obj) {
    this.appData = {};
    this.updateFromJSON(json_obj);
  }

  async initUUID() {
    if(!this.uuid) {
      return Crypto.generateUUID().then(function(uuid){
        this.uuid = uuid;
      }.bind(this))
    }
  }

  static sortItemsByDate(items) {
    items.sort(function(a,b){
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  get contentObject() {
    if(!this.content) {
      return {};
    }

    if(this.content !== null && typeof this.content === 'object') {
      // this is the case when mapping localStorage content, in which case the content is already parsed
      return this.content;
    }

    try {
      return JSON.parse(this.content);
    } catch (e) {
      console.log("Error parsing json", e);
      return {};
    }
  }

  get key() {
    return this.uuid;
  }

  updateFromJSON(json) {
    _.merge(this, json);

    if(this.created_at) {
      this.created_at = moment(this.created_at);
      this.updated_at = moment(this.updated_at);
    } else {
      this.created_at = moment(new Date());
      this.updated_at = moment(new Date());
    }

    if(json.content) {
      this.mapContentToLocalProperties(this.contentObject);
    }
  }

  setDirty(dirty) {
    this.dirty = dirty;
  }

  markAllReferencesDirty() {
    this.allReferencedObjects().forEach(function(reference){
      reference.setDirty(true);
    })
  }

  mapContentToLocalProperties(contentObj) {
    this.appData = contentObj.appData;
    if(!this.appData) {
      this.appData = {};
    }
  }

  createContentJSONFromProperties() {
    return this.structureParams();
  }

  referenceParams() {
    // must override
  }

  structureParams() {
    return {
      references: this.referenceParams(),
      appData: this.appData
    }
  }

  addItemAsRelationship(item) {
    // must override
  }

  removeItemAsRelationship(item) {
    // must override
  }

  isBeingRemovedLocally() {

  }

  removeAllRelationships() {
    // must override
    this.setDirty(true);
  }

  removeReferencesNotPresentIn(references) {

  }

  mergeMetadataFromItem(item) {
    _.merge(this, _.omit(item, ["content"]));
  }

  informReferencesOfUUIDChange(oldUUID, newUUID) {
    // optional override
  }

  potentialItemOfInterestHasChangedItsUUID(newItem, oldUUID, newUUID) {
    // optional override
  }

  allReferencedObjects() {
    // must override
    return [];
  }

  createdAt() {
    return this.dateToString(this.created_at, true);
  }

  updatedAt() {
    return this.dateToString(this.updated_at, true);
  }

  dateToString(date, withTime) {
    if(withTime) {
      return moment(date).format('llll')
    } else {
      return moment(date).format('l')
    }
  }

  doNotEncrypt() {
    return false;
  }

  /*
  App Data
  */

  setAppDataItem(key, value) {
    var data = this.appData[AppDomain];
    if(!data) {
      data = {}
    }
    data[key] = value;
    this.appData[AppDomain] = data;
  }

  getAppDataItem(key) {
    var data = this.appData[AppDomain];
    if(data) {
      return data[key];
    } else {
      return null;
    }
  }
}

import Item from "../api/item"
var _ = require('lodash')

export default class Note extends Item {

  constructor(json_obj) {
    super(json_obj);

    if(!this.tags) {
      this.tags = [];
    }
  }

  mapContentToLocalProperties(contentObject) {
    super.mapContentToLocalProperties(contentObject)
    this.title = contentObject.title;
    this.text = contentObject.text;
  }

  referenceParams() {
    var references = _.map(this.tags, function(tag){
      return {uuid: tag.uuid, content_type: tag.content_type};
    })

    return references;
  }

  structureParams() {
    var params = {
      title: this.title,
      text: this.text
    };

    _.merge(params, super.structureParams());
    return params;
  }

  addItemAsRelationship(item) {
    if(item.content_type == "Tag") {
      if(!_.find(this.tags, item)) {
        this.tags.push(item);
        this.tags = Array.from(this.tags);
      }
    }
    super.addItemAsRelationship(item);
  }

  removeItemAsRelationship(item) {
    if(item.content_type == "Tag") {
      _.pull(this.tags, item);
    }
    super.removeItemAsRelationship(item);
  }

  removeAllRelationships() {
    this.tags.forEach(function(tag){
      _.pull(tag.notes, this);
      tag.setDirty(true);
    }.bind(this))
    this.tags = [];
  }

  removeReferencesNotPresentIn(references) {
    super.removeReferencesNotPresentIn(references);

    var uuids = references.map(function(ref){return ref.uuid});
    this.tags.slice().forEach(function(tag){
      if(!uuids.includes(tag.uuid)) {
        _.pull(tag.notes, this);
        _.pull(this.tags, tag);
      }
    }.bind(this))

    this.tags = Array.from(this.tags);
  }

  isBeingRemovedLocally() {
    this.tags.forEach(function(tag){
      _.pull(tag.notes, this);
    }.bind(this))
    super.isBeingRemovedLocally();
  }

  static filterDummyNotes(notes) {
    var filtered = notes.filter(function(note){return note.dummy == false || note.dummy == null});
    return filtered;
  }

  informReferencesOfUUIDChange(oldUUID, newUUID) {
    for(var tag of this.tags) {
      _.pull(tag.notes, {uuid: oldUUID});
      tag.notes.push(this);
    }
  }

  replaceTags(newTags) {
    var oldTags = this.tags.slice(); // original array will be modified in the for loop so we make a copy
    for(var oldTag of oldTags) {
      if(!newTags.includes(oldTag)) {
        oldTag.setDirty(true);
        this.removeItemAsRelationship(oldTag);
        oldTag.removeItemAsRelationship(this);
      }
    }

    for(var newTag of newTags) {
      newTag.setDirty(true);
      newTag.addItemAsRelationship(this);
    }

    this.tags = newTags;
  }

  allReferencedObjects() {
    return this.tags;
  }

  safeText() {
    return this.text || "";
  }

  safeTitle() {
    return this.title || "";
  }

  toJSON() {
    return {uuid: this.uuid}
  }

  get content_type() {
    return "Note";
  }

  get pinned() {
    return this.getAppDataItem("pinned");
  }

  get archived() {
    return this.getAppDataItem("archived");
  }
}

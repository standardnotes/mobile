import Storage from "./storageManager"
import Theme from "../../models/subclass/theme"
import "../../models/extend/item.js";

SFModelManager.ContentTypeClassMapping = {
  "Note" : SNNote,
  "Tag" : SNTag,
  "SN|Theme" : Theme,
  "SN|Component" : SNComponent
};

SFItem.AppDomain = "org.standardnotes.sn";

export default class ModelManager extends SFModelManager {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new ModelManager();
    }

    return this.instance;
  }

  constructor() {
    super();

    this.notes = [];
    this.tags = [];
    this.themes = [];

    this.acceptableContentTypes = ["Note", "Tag", "SN|Theme", "SN|Component"];
  }

  handleSignout() {
    super.handleSignout();
    this.notes.length = 0;
    this.tags.length = 0;
    this.themes.length = 0;
  }

  findOrCreateTagByTitle(title) {
    var tag = _.find(this.tags, {title: title})
    if(!tag) {
      tag = this.createItem({content_type: "Tag", title: title});
      this.addItem(tag);
    }
    return tag;
  }

  addItems(items, globalOnly = false) {
    super.addItems(items, globalOnly);

    items.forEach((item) => {
      // In some cases, you just want to add the item to this.items, and not to the individual arrays
      // This applies when you want to keep an item syncable, but not display it via the individual arrays
      if(!globalOnly) {
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
     }
    });
  }

  async removeItemLocally(item) {
    super.removeItemLocally(item);

    if(item.content_type == "Tag") {
      _.remove(this.tags, {uuid: item.uuid});
    } else if(item.content_type == "Note") {
      _.remove(this.notes, {uuid: item.uuid});
    } else if(item.content_type == "SN|Theme") {
      _.remove(this.themes, {uuid: item.uuid});
    }

    return Storage.get().deleteModel(item);
  }

  getNotes(options = {}) {
    var notes;
    var tags = [];
    if(options.selectedTags && options.selectedTags.length > 0 && options.selectedTags[0].key !== "all") {
      tags = ModelManager.get().findItems(options.selectedTags);
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

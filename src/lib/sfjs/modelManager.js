import Storage from "./storageManager"
import "../../models/extend/item.js";
import { SFPredicate } from "standard-file-js";

SFModelManager.ContentTypeClassMapping = {
  "Note" : SNNote,
  "Tag" : SNTag,
  "SN|SmartTag": SNSmartTag,
  "SN|Theme" : SNTheme,
  "SN|Component" : SNComponent
};

const SystemSmartTagIdAllNotes = "all-notes";
const SystemSmartTagIdArchivedNotes = "archived-notes";

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

    this.acceptableContentTypes = ["Note", "Tag", "SN|SmartTag", "SN|Theme", "SN|Component"];

    this.buildSystemSmartTags();
  }

  handleSignout() {
    super.handleSignout();
    this.notes.length = 0;
    this.tags.length = 0;
    this.themes.length = 0;
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
    await super.removeItemLocally(item);

    if(item.content_type == "Tag") {
      _.remove(this.tags, {uuid: item.uuid});
    } else if(item.content_type == "Note") {
      _.remove(this.notes, {uuid: item.uuid});
    } else if(item.content_type == "SN|Theme") {
      _.remove(this.themes, {uuid: item.uuid});
    }

    return Storage.get().deleteModel(item);
  }

  /* Be sure not to use just findItems in your views, because those won't find system smart tags */
  getTagsWithIds(ids) {
    let tagMatches = ModelManager.get().findItems(ids);
    let smartMatches = this.getSmartTagsWithIds(ids);
    return tagMatches.concat(smartMatches);
  }

  buildSystemSmartTags() {
    this.systemSmartTags = [
      new SNSmartTag({
        uuid: SystemSmartTagIdAllNotes,
        content: {
          title: "All notes",
          isAllTag: true,
          predicate: new SFPredicate.fromArray(["content_type", "=", "Note"])
        }
      }),
      new SNSmartTag({
        uuid: SystemSmartTagIdArchivedNotes,
        content: {
          title: "Archived",
          isArchiveTag: true,
          predicate: new SFPredicate.fromArray(["archived", "=", true])
        }
      })
    ]
  }

  systemSmartTagIds() {
    return [
      SystemSmartTagIdAllNotes,
      SystemSmartTagIdArchivedNotes
    ]
  }

  getSmartTagWithId(id) {
    return this.getSmartTags().find((candidate) => candidate.uuid == id);
  }

  getSmartTagsWithIds(ids) {
    return this.getSmartTags().filter((candidate) => ids.includes(candidate.uuid));
  }

  getSmartTags() {
    let userTags = this.validItemsForContentType("SN|SmartTag").sort((a, b) => {
      return a.content.title < b.content.title ? -1 : 1;
    });;
    return this.systemSmartTags.concat(userTags);
  }

  notesMatchingPredicate(predicate) {
    let notePredicate = ["content_type", "=", "Note"];
    // itemsMatchingPredicate can return non-note types
    return this.itemsMatchingPredicates([notePredicate, predicate]);
  }

  getNotes(options = {}) {
    let notes, tags = [], selectedSmartTag;
    // if(options.selectedTagIds && options.selectedTagIds.length > 0 && options.selectedTagIds[0].key !== "all") {
    let selectedTagIds = options.selectedTagIds;
    if(selectedTagIds && selectedTagIds.length > 0) {
      selectedSmartTag = selectedTagIds.length == 1 && this.getSmartTagWithId(selectedTagIds[0]);
      if(selectedSmartTag) {
        notes = this.notesMatchingPredicate(selectedSmartTag.content.predicate);
      } else {
        tags = ModelManager.get().findItems(options.selectedTagIds);
        if(tags.length > 0) {
          var taggedNotes = new Set();
          for(var tag of tags) {
            taggedNotes = new Set([...taggedNotes, ...new Set(tag.notes)])
          }
          notes = Array.from(taggedNotes);
        }
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

    notes = notes.filter((note) => {
      if(note.deleted) {
        return false;
      }

      // If we're not dealing with the system archived tag, then we only want to
      // filter for this note if it's not archived. (Hide archived if not archive tag)
      let isExplicitlyArchiveTag = selectedSmartTag && selectedSmartTag.content.isArchiveTag;
      if(!isExplicitlyArchiveTag) {
        return !note.archived;
      } else {
        return note.archived;
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

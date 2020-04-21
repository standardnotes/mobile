import { SNMfa, SNServerExtension, SNExtension, SNEditor } from 'snjs';
import _ from 'lodash';
import { SFPredicate, SFPrivileges, SFModelManager } from 'standard-file-js';
import { SNNote, SNTag, SNTheme, SNComponent, SNSmartTag } from 'snjs';
import Storage from '@SFJS/storageManager';
import '../../models/extend/item.js';

SFModelManager.ContentTypeClassMapping = {
  Note: SNNote,
  Tag: SNTag,
  'SN|SmartTag': SNSmartTag,
  Extension: SNExtension,
  'SN|Editor': SNEditor,
  'SN|Theme': SNTheme,
  'SN|Component': SNComponent,
  'SF|Extension': SNServerExtension,
  'SF|MFA': SNMfa,
  'SN|Privileges': SFPrivileges,
};

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

    items.forEach(item => {
      // In some cases, you just want to add the item to this.items, and not to the individual arrays
      // This applies when you want to keep an item syncable, but not display it via the individual arrays
      if (!globalOnly) {
        if (item.content_type === 'Tag') {
          if (!_.find(this.tags, { uuid: item.uuid })) {
            this.tags.splice(
              _.sortedIndexBy(this.tags, item, function (item) {
                if (item.title) {
                  return item.title.toLowerCase();
                } else {
                  return '';
                }
              }),
              0,
              item
            );
          }
        } else if (item.content_type === 'Note') {
          if (!_.find(this.notes, { uuid: item.uuid })) {
            this.notes.unshift(item);
          }
        } else if (item.content_type === 'SN|Theme') {
          if (!_.find(this.themes, { uuid: item.uuid })) {
            this.themes.unshift(item);
          }
        }
      }
    });
  }

  async removeItemLocally(item) {
    await super.removeItemLocally(item);

    if (item.content_type === 'Tag') {
      _.remove(this.tags, { uuid: item.uuid });
    } else if (item.content_type === 'Note') {
      _.remove(this.notes, { uuid: item.uuid });
    } else if (item.content_type === 'SN|Theme') {
      _.remove(this.themes, { uuid: item.uuid });
    }

    return Storage.get().deleteModel(item);
  }

  noteCount() {
    return this.notes.filter(n => !n.dummy).length;
  }

  /* Be sure not to use just findItems in your views, because those won't find system smart tags */
  getTagsWithIds(ids) {
    let tagMatches = ModelManager.get().findItems(ids);
    let smartMatches = this.getSmartTagsWithIds(ids);
    return tagMatches.concat(smartMatches);
  }

  getTagWithId(id) {
    let tags = this.getTagsWithIds([id]);
    if (tags.length > 0) {
      return tags[0];
    }
  }

  buildSystemSmartTags() {
    this.systemSmartTags = SNSmartTag.systemSmartTags();
  }

  defaultSmartTag() {
    return this.systemSmartTags[0];
  }

  systemSmartTagIds() {
    return this.systemSmartTags.map(tag => {
      return tag.uuid;
    });
  }

  getSmartTagWithId(id) {
    return this.getSmartTags().find(candidate => candidate.uuid === id);
  }

  getSmartTagsWithIds(ids) {
    return this.getSmartTags().filter(candidate =>
      ids.includes(candidate.uuid)
    );
  }

  getSmartTags() {
    const userTags = this.validItemsForContentType('SN|SmartTag').sort(
      (a, b) => {
        return a.content.title < b.content.title ? -1 : 1;
      }
    );
    return this.systemSmartTags.concat(userTags);
  }

  trashSmartTag() {
    return this.systemSmartTags.find(tag => tag.content.isTrashTag);
  }

  trashedItems() {
    return this.notesMatchingSmartTag(this.trashSmartTag());
  }

  emptyTrash() {
    const notes = this.trashedItems();
    for (const note of notes) {
      this.setItemToBeDeleted(note);
    }
  }

  notesMatchingSmartTag(tag) {
    const contentTypePredicate = new SFPredicate('content_type', '=', 'Note');
    const predicates = [contentTypePredicate, tag.content.predicate];
    if (!tag.content.isTrashTag) {
      const notTrashedPredicate = new SFPredicate(
        'content.trashed',
        '=',
        false
      );
      predicates.push(notTrashedPredicate);
    }
    return this.itemsMatchingPredicates(predicates);
  }

  getNotes(options = {}) {
    let notes,
      tags = [],
      selectedSmartTag;
    // if (options.selectedTagIds && options.selectedTagIds.length > 0 && options.selectedTagIds[0].key !== "all") {
    let selectedTagIds = options.selectedTagIds;
    if (selectedTagIds && selectedTagIds.length > 0) {
      selectedSmartTag =
        selectedTagIds.length === 1 &&
        this.getSmartTagWithId(selectedTagIds[0]);
      if (selectedSmartTag) {
        notes = this.notesMatchingSmartTag(selectedSmartTag);
      } else {
        tags = ModelManager.get().findItems(options.selectedTagIds);
        if (tags.length > 0) {
          let taggedNotes = new Set();
          for (const tag of tags) {
            taggedNotes = new Set([...taggedNotes, ...new Set(tag.notes)]);
          }
          notes = Array.from(taggedNotes);
        }
      }
    }

    if (!notes) {
      notes = this.notes;
    }

    let searchTerm = options.searchTerm;
    if (searchTerm) {
      searchTerm = searchTerm.toLowerCase();
      notes = notes.filter(function (note) {
        return (
          note.safeTitle().toLowerCase().includes(searchTerm) ||
          note.safeText().toLowerCase().includes(searchTerm)
        );
      });
    }

    const sortBy = options.sortBy;
    const sortReverse = options.sortReverse;

    notes = notes.filter(note => {
      if (note.deleted || note.dummy) {
        return false;
      }

      const isTrash = selectedSmartTag && selectedSmartTag.content.isTrashTag;
      const canShowArchived =
        (selectedSmartTag && selectedSmartTag.content.isArchiveTag) || isTrash;

      if (!isTrash && note.content.trashed) {
        return false;
      }

      if (note.archived && !canShowArchived) {
        return false;
      }

      return true;
    });

    const sortValueFn = (a, b, pinCheck = false) => {
      if (!pinCheck) {
        if (a.pinned && b.pinned) {
          return sortValueFn(a, b, true);
        }
        if (a.pinned) {
          return -1;
        }
        if (b.pinned) {
          return 1;
        }
      }

      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';

      let vector = 1;

      if (sortReverse) {
        vector *= -1;
      }

      if (sortBy === 'title') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();

        if (aValue.length === 0 && bValue.length === 0) {
          return 0;
        } else if (aValue.length === 0 && bValue.length !== 0) {
          return 1 * vector;
        } else if (aValue.length !== 0 && bValue.length === 0) {
          return -1 * vector;
        } else {
          vector *= -1;
        }
      }

      if (aValue > bValue) {
        return -1 * vector;
      } else if (aValue < bValue) {
        return 1 * vector;
      }
      return 0;
    };

    notes = notes.sort(function (a, b) {
      return sortValueFn(a, b);
    });

    return { notes: notes, tags: tags };
  }

  /*
  Misc
  */

  humanReadableDisplayForContentType(contentType) {
    return {
      Note: 'note',
      Tag: 'tag',
      'SN|SmartTag': 'smart tag',
      Extension: 'action-based extension',
      'SN|Component': 'component',
      'SN|Editor': 'editor',
      'SN|Theme': 'theme',
      'SF|Extension': 'server extension',
      'SF|MFA': 'two-factor authentication setting',
      'SN|FileSafe|Credentials': 'FileSafe credential',
      'SN|FileSafe|FileMetadata': 'FileSafe file',
      'SN|FileSafe|Integration': 'FileSafe integration',
    }[contentType];
  }
}

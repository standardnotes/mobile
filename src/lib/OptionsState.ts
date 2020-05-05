import _ from 'lodash';
import Storage from '@Lib/snjs/storageManager';

type OptionsStateStateType =
  | typeof OptionsState.OptionsStateChangeEventSearch
  | typeof OptionsState.OptionsStateChangeEventTags
  | typeof OptionsState.OptionsStateChangeEventViews
  | typeof OptionsState.OptionsStateChangeEventSort;

export type Observer = {
  key: () => number;
  callback: (state: OptionsState, newState?: OptionsStateStateType) => void;
};

export default class OptionsState {
  static OptionsStateChangeEventSearch = 'OptionsStateChangeEventSearch' as 'OptionsStateChangeEventSearch';
  static OptionsStateChangeEventTags = 'OptionsStateChangeEventTags' as 'OptionsStateChangeEventTags';
  static OptionsStateChangeEventViews = 'OptionsStateChangeEventViews' as 'OptionsStateChangeEventViews';
  static OptionsStateChangeEventSort = 'OptionsStateChangeEventSort' as 'OptionsStateChangeEventSort';
  changeObservers: Observer[];
  sortBy: string;
  selectedTagIds: string[];
  sortReverse: boolean;
  searchTerm: string | null = null;
  displayOptions?: {
    hidePreviews: boolean;
    hideTags: boolean;
    hideDates: boolean;
  };
  hidePreviews: boolean = false;
  hideDates: boolean = false;
  hideTags: boolean = false;

  constructor() {
    this.searchTerm = '';
    this.selectedTagIds = [];
    this.sortBy = 'created_at';
    this.sortReverse = false;

    // TODO: not used
    // _.merge(this, _.omit(json, ['changeObservers']));
    this.changeObservers = [];

    if (this.sortBy === 'updated_at') {
      // migrate to client modified date if using old property
      this.sortBy = 'client_updated_at';
    }
  }

  init() {
    this.searchTerm = '';
    this.selectedTagIds = [];
    this.sortBy = 'created_at';
    this.sortReverse = false;
  }

  reset(notifyObservers = true) {
    this.init();
    if (notifyObservers) {
      this.notifyObservers();
    }
  }

  async loadSaved() {
    return Storage.get()
      .getItem('options')
      .then(result => {
        if (result) {
          _.merge(this, _.omit(JSON.parse(result), ['changeObservers']));
        }
        this.rebuildOptions();
        this.notifyObservers();
      });
  }

  persist() {
    Storage.get().setItem('options', JSON.stringify(this));
  }

  toJSON() {
    return _.merge(
      {
        sortBy: this.sortBy,
        sortReverse: this.sortReverse,
        selectedTagIds: this.selectedTagIds,
      },
      this.getDisplayOptionValues()
    );
  }

  addChangeObserver(callback: Observer['callback']) {
    const observer = { key: Math.random, callback };
    this.changeObservers.push(observer);
    return observer;
  }

  removeChangeObserver(observer: Observer) {
    _.pull(this.changeObservers, observer);
  }

  notifyObservers(newOption?: OptionsStateStateType) {
    this.changeObservers.forEach(
      function (observer: Observer) {
        // @ts-ignore
        observer.callback(this as OptionsState, newOption);
      }.bind(this)
    );
  }

  // Interface
  setSearchTerm(term: string | null) {
    this.searchTerm = term;
    this.notifyObservers(OptionsState.OptionsStateChangeEventSearch);
  }

  setSortReverse(reverse: boolean) {
    this.sortReverse = reverse;
    this.notifyObservers(OptionsState.OptionsStateChangeEventSort);
  }

  setSortBy(sortBy: string) {
    this.sortBy = sortBy;
    this.notifyObservers(OptionsState.OptionsStateChangeEventSort);
  }

  setSelectedTagIds(selectedTagIds: string[]) {
    this.selectedTagIds = selectedTagIds;
    this.notifyObservers(OptionsState.OptionsStateChangeEventTags);
  }

  getSelectedTagIds() {
    return this.selectedTagIds;
  }

  getDisplayOptionValues() {
    if (!this.displayOptions) {
      this.rebuildOptions();
    }
    return this.displayOptions;
  }

  rebuildOptions() {
    this.displayOptions = {
      hidePreviews: this.getDisplayOptionValue('hidePreviews'),
      hideTags: this.getDisplayOptionValue('hideTags'),
      hideDates: this.getDisplayOptionValue('hideDates'),
    };
  }

  getDisplayOptionValue(key: string) {
    if (key === 'hidePreviews') {
      return this.hidePreviews;
    } else if (key === 'hideDates') {
      return this.hideDates;
    } else if (key === 'hideTags') {
      return this.hideTags;
    }
    return false;
  }

  setDisplayOptionKeyValue(key: string, value: any) {
    if (key === 'hidePreviews') {
      this.hidePreviews = value;
    } else if (key === 'hideDates') {
      this.hideDates = value;
    } else if (key === 'hideTags') {
      this.hideTags = value;
    }

    this.rebuildOptions();

    this.notifyObservers(OptionsState.OptionsStateChangeEventViews);
  }
}

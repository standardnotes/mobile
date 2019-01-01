import Storage from "./lib/sfjs/storageManager"

export default class OptionsState {

  static OptionsStateChangeEventSearch = "OptionsStateChangeEventSearch";
  static OptionsStateChangeEventTags = "OptionsStateChangeEventTags";
  static OptionsStateChangeEventViews = "OptionsStateChangeEventViews"
  static OptionsStateChangeEventTags = "OptionsStateChangeEventSort"

  constructor(json) {

    this.init();
    _.merge(this, _.omit(json, ["changeObservers"]));
    this.changeObservers = [];

    if(this.sortBy == "updated_at") {
      // migrate to client modified date if using old property
      this.sortBy = "client_updated_at";
    }
  }

  init() {
    this.selectedTagIds = [];
    this.sortBy = "created_at";
    this.sortReverse = false;
  }

  reset() {
    this.init();
    this.notifyObservers();
  }

  async loadSaved() {
    return Storage.get().getItem("options").then((result) => {
      _.merge(this, _.omit(JSON.parse(result), ["changeObservers"]));
      this.rebuildOptions();
      this.notifyObservers();
    })
  }

  persist() {
    Storage.get().setItem("options", JSON.stringify(this));
  }

  toJSON() {
    return _.merge({
      sortBy: this.sortBy,
      sortReverse: this.sortReverse,
      selectedTagIds: this.selectedTagIds
    }, this.getDisplayOptionValues());
  }

  addChangeObserver(callback) {
    var observer = {key: Math.random, callback: callback};
    this.changeObservers.push(observer);
    return observer;
  }

  removeChangeObserver(observer) {
    _.pull(this.changeObservers, observer);
  }

  notifyObservers(event) {
    this.changeObservers.forEach(function(observer){
      observer.callback(this, event);
    }.bind(this))
  }

  // Interface

  mergeWith(options) {
    _.extend(this, _.omit(options, ["changeObservers"]));
    this.notifyObservers();
  }

  setSearchTerm(term) {
    this.searchTerm = term;
    this.notifyObservers(OptionsState.OptionsStateChangeEventSearch);
  }

  setSortReverse(reverse) {
    this.sortReverse = reverse;
    this.notifyObservers(OptionsState.OptionsStateChangeEventSort);
  }

  setSortBy(sortBy) {
    this.sortBy = sortBy;
    this.notifyObservers(OptionsState.OptionsStateChangeEventSort);
  }

  setSelectedTagIds(selectedTagIds) {
    this.selectedTagIds = selectedTagIds;
    this.notifyObservers(OptionsState.OptionsStateChangeEventTags);
  }

  getSelectedTagIds() {
    return this.selectedTagIds;
  }

  getDisplayOptionValues() {
    if(!this.displayOptions) {
      this.rebuildOptions();
    }
    return this.displayOptions;
  }

  rebuildOptions() {
    this.displayOptions = {
      hidePreviews: this.getDisplayOptionValue("hidePreviews"),
      hideTags:     this.getDisplayOptionValue("hideTags"),
      hideDates:    this.getDisplayOptionValue("hideDates")
    }
  }

  getDisplayOptionValue(key) {
    if(key == "hidePreviews") {
      return this.hidePreviews;
    } else if(key == "hideDates") {
      return this.hideDates;
    } else if(key == "hideTags") {
      return this.hideTags;
    }
  }

  setDisplayOptionKeyValue(key, value) {
    if(key == "hidePreviews") {
      this.hidePreviews = value;
    } else if(key == "hideDates") {
      this.hideDates = value;
    } else if(key == "hideTags") {
      this.hideTags = value;
    }

    this.rebuildOptions();

    this.notifyObservers(OptionsState.OptionsStateChangeEventViews);
  }
}

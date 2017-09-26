import Storage from "./lib/storage"
var _ = require('lodash');

export default class OptionsState {

  constructor(json) {
    this.init();
    _.merge(this, _.omit(json, ["changeObservers"]));
    this.changeObservers = [];
  }

  init() {
    this.selectedTags = [];
    this.sortBy = "created_at";
  }

  reset() {
    this.init();
    this.notifyObservers();
  }

  async loadSaved() {
    Storage.getItem("options").then(function(result){
      console.log("Loaded options json results", result);
      _.merge(this, _.omit(JSON.parse(result), ["changeObservers"]));
      this.notifyObservers();
    }.bind(this))
  }

  persist() {
    console.log("Persisting Options", JSON.stringify(this));
    Storage.setItem("options", JSON.stringify(this));
  }

  toJSON() {
    return {sortBy: this.sortBy, archivedOnly: this.archivedOnly, selectedTags: this.selectedTags};
  }

  addChangeObserver(callback) {
    var observer = {key: Math.random, callback: callback};
    this.changeObservers.push(observer);
    return observer;
  }

  removeChangeObserver(observer) {
    _.pull(this.changeObservers, observer);
  }

  notifyObservers() {
    this.changeObservers.forEach(function(observer){
      observer.callback(this);
    }.bind(this))
  }

  // Interface

  mergeWith(options) {
    _.extend(this, _.omit(options, ["changeObservers"]));
    this.notifyObservers();
  }

  setSearchTerm(term) {
    this.searchTerm = term;
    this.notifyObservers();
  }

  setSortBy(sortBy) {
    this.sortBy = sortBy;
    this.notifyObservers();
  }

  setArchivedOnly(archived) {
    this.archivedOnly = archived;
    this.notifyObservers();
  }

  setSelectedTags(selectedTags) {
    this.selectedTags = selectedTags;
    this.notifyObservers();
  }
}

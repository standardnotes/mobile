export default class Lodash {

  includes(array, item) {
    return array.includes(item);
  }

  find(array, keyValues) {
    return array.find(function(candidate){
      for(var key in keyValues) {
        if(candidate[key] !== keyValues[key]) {
          continue;
        }
        return candidate;
      }
    })
  }

  omit(object, keys) {
    if(keys == null) {
      return object;
    }

    for(var key of keys) {
      object[key] = undefined;
    }
    return object;
  }

  uniq(items) {
    return [...new Set(items)]
  }

  pull(array, item) {
    array.splice(array.indexOf(item), 1);
  }

  remove(array, predicate) {
    this.pull(array, this.find(array, predicate));
  }

  map(items, filterFunc) {
    return items.map(filterFunc);
  }

  merge(baseObject, mergeMe) {
    Object.assign(baseObject, mergeMe);
  }

  pick(object, keys) {
    var newObject = {};
    for(var key of keys) {
      newObject[key] = object[key];
    }
    return newObject;
  }

}

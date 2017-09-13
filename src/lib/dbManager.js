import { AsyncStorage } from 'react-native';

export default class DBManager {

  static getAllItems(callback) {
    var items = [];
    AsyncStorage.getAllKeys(function(error, keys) {
      AsyncStorage.multiGet(keys, (err, stores) => {
       stores.map((result, i, store) => {
         // get at each store's key/value so you can work with it
         let key = store[i][0];
         if(key.includes("Item-")) {
           let value = store[i][1];
           items.push(JSON.parse(value));
         }
        });
        callback(items);
      });
    })
  }

  static saveItem(item) {
    this.saveItems([item]);
  }

  static keyForItem(item) {
    return "Item-" + item.uuid;
  }

  static getAllItemKeys(callback) {
    AsyncStorage.getAllKeys(function(error, keys) {
      var filtered = keys.filter(function(key){
        return key.includes("Item-");
      })
      callback(filtered);
    })
  }

  static saveItems(items, callback) {

    if(items.length == 0) {
      if(callback) {
        callback();
      }
      return;
    }

    Promise.all(items.map(function(item){
      AsyncStorage.setItem(DBManager.keyForItem(item), JSON.stringify(item));
    })).then(function(){
      if(callback) {
        callback();
      }
    })

    /*
      // Note: multiset is not working properly; returns with error
      AsyncStorage.multiSet(data, function(error){ callback(); })
    */
  }

  static deleteItem(item, callback) {
    console.log("===Deleting item===");
    AsyncStorage.removeItem(DBManager.keyForItem(item), function(error){
      if(error) {
        console.error("Error deleting item", item);
      }
      if(callback) {
        callback();
      }
    })
  }

  static clearAllItems(callback) {
    this.getAllItemKeys(function(itemKeys){
      AsyncStorage.multiRemove(itemKeys, function(){
        callback();
      })
    });
  }
}

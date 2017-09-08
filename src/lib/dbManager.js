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

  static saveItems(items, callback) {

    if(items.length == 0) {
      if(callback) {
        callback();
      }
      return;
    }

    Promise.all(items.map(function(item){
      AsyncStorage.setItem("Item-" + item.uuid, JSON.stringify(item));
    })).then(function(){
      if(callback) {
        callback();
      }
    })

    /* multiset is not working properly; returns with error */

    // AsyncStorage.multiSet(data, function(error){
    //   console.log("Save items error:", error);
    //   if(callback) {
    //     callback();
    //   }
    // })

  }

  static deleteItem(item, callback) {
    AsyncStorage.removeItem(item.uuid, function(error){
        callback();
    })
  }

  static clearAllItems(callback) {
    AsyncStorage.clear(function(error){
      callback();
    })
  }
}

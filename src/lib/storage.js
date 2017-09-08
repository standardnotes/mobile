import { AsyncStorage } from 'react-native';

export default class Storage {

  static async getItem(key) {
    try {
      return AsyncStorage.getItem(key);
    } catch (error) {
      console.log("Error getting item", error);
      return null;
    }
  }

  static async setItem(key, value) {
    if(value == null || value == undefined || key == null || key == undefined) {
      return;
    }
    try {
      return AsyncStorage.setItem(key, value);
    } catch (error) {
      console.log("Error setting item", error);
      return null;
    }
  }

  static async removeItem(key) {
    return await AsyncStorage.removeItem(key);
  }

}

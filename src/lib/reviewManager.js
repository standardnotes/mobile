import * as StoreReview from 'react-native-store-review';
import {Platform} from 'react-native';
import Storage from "./storage";

let NumRunsBeforeAskingForReview = [5, 20, 50]

export default class ReviewManager {

  static initialize() {
    if(Platform.OS == "android" || !StoreReview.isAvailable) {
      return;
    }

    this.getRunCount().then((runCount) => {
      this.setRunCount(runCount + 1);
      if(NumRunsBeforeAskingForReview.includes(runCount)) {
        setTimeout(function () {
          StoreReview.requestReview();
        }, 1000);
      }
    })
  }

  static async getRunCount() {
    return Storage.getItem("runCount").then((runCount) => {
      return JSON.parse(runCount);
    })
  }

  static async setRunCount(runCount) {
    return Storage.setItem("runCount", JSON.stringify(runCount));
  }

}

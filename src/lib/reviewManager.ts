import { Platform } from 'react-native';
import * as StoreReview from 'react-native-store-review';
import Storage from '@Lib/snjs/storageManager';

const RUN_COUNTS_BEFORE_REVIEW = [18, 45, 105];

export default class ReviewManager {
  static initialize() {
    if (Platform.OS === 'android' || !StoreReview.isAvailable) {
      return;
    }

    this.getRunCount().then(runCount => {
      this.setRunCount(runCount + 1);
      if (RUN_COUNTS_BEFORE_REVIEW.includes(runCount)) {
        setTimeout(function () {
          StoreReview.requestReview();
        }, 1000);
      }
    });
  }

  static async getRunCount() {
    return Storage.get()
      .getItem('runCount')
      .then(runCount => {
        if (runCount) {
          return JSON.parse(runCount);
        }
      });
  }

  static async setRunCount(runCount: number) {
    return Storage.get().setItem('runCount', JSON.stringify(runCount));
  }
}

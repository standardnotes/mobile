import { ApplicationService, Platform } from '@standardnotes/snjs';
import * as StoreReview from 'react-native-store-review';

const RUN_COUNTS_BEFORE_REVIEW = [18, 45, 105];

export class ReviewService extends ApplicationService {
  async onAppLaunch() {
    if (
      this.application?.platform === Platform.Android ||
      !StoreReview.isAvailable
    ) {
      return;
    }

    const runCount = await this.getRunCount();
    this.setRunCount(runCount + 1);
    if (RUN_COUNTS_BEFORE_REVIEW.includes(runCount)) {
      setTimeout(function () {
        StoreReview.requestReview();
      }, 1000);
    }
  }

  async getRunCount() {
    return this.application?.getValue('runCount').then(runCount => {
      if (runCount) {
        return JSON.parse(runCount);
      }
    });
  }

  async setRunCount(runCount: number) {
    return this.application?.setValue('runCount', JSON.stringify(runCount));
  }
}

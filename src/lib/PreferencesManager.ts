import {
  ApplicationService,
  ContentType,
  FillItemContent,
  MobilePrefKey,
  SNPredicate,
  SNUserPrefs,
  UserPrefsMutator,
} from 'snjs';
import { MobileApplication } from './application';

export const LAST_EXPORT_DATE_KEY = 'LastExportDateKey';

export class PreferencesManager extends ApplicationService {
  private userPreferences!: SNUserPrefs;
  private loadingPrefs = false;
  private unubscribeStreamItems?: () => void;

  /** @override */
  async onAppLaunch() {
    super.onAppLaunch();
    this.loadSingleton();
    this.streamPreferences();
  }

  deinit() {
    this.unubscribeStreamItems && this.unubscribeStreamItems();
  }

  get mobileApplication() {
    return this.application as MobileApplication;
  }

  streamPreferences() {
    this.unubscribeStreamItems = this.application!.streamItems(
      ContentType.UserPrefs,
      () => {
        this.loadSingleton();
      }
    );
  }

  private async loadSingleton(forceSave?: boolean) {
    if (this.loadingPrefs) {
      return;
    }
    this.loadingPrefs = true;
    const contentType = ContentType.UserPrefs;
    const predicate = new SNPredicate('content_type', '=', contentType);
    const previousRef = this.userPreferences;
    this.userPreferences = (await this.application!.singletonManager!.findOrCreateSingleton(
      predicate,
      contentType,
      FillItemContent({})
    )) as SNUserPrefs;
    this.loadingPrefs = false;
    const didChange =
      !previousRef ||
      this.userPreferences.lastSyncBegan?.getTime() !==
        previousRef?.lastSyncBegan?.getTime();
    if (forceSave || didChange) {
      this.mobileApplication
        .getAppState()
        .setUserPreferences(this.userPreferences);
    }
  }

  syncUserPreferences() {
    if (this.userPreferences) {
      this.application!.saveItem(this.userPreferences.uuid);
    }
  }

  getValue(key: MobilePrefKey, defaultValue?: any) {
    if (!this.userPreferences) {
      return defaultValue;
    }
    const value = this.userPreferences.getPref(key);
    return value !== undefined && value !== null ? value : defaultValue;
  }

  async setUserPrefValue(key: MobilePrefKey, value: any, sync = false) {
    await this.application!.changeItem(this.userPreferences.uuid, m => {
      const mutator = m as UserPrefsMutator;
      mutator.setMobilePref(key, value);
    });
    if (sync) {
      this.syncUserPreferences();
    }
  }
}

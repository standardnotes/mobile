import { ApplicationService, isNullOrUndefined } from 'snjs';
import { MobileApplication } from './application';

export enum PrefKey {
  SortNotesBy = 'sortBy',
  SortNotesReverse = 'sortReverse',
  NotesHideNotePreview = 'hideNotePreview',
  NotesHideDate = 'hideDate',
  NotesHideTags = 'hideTags',
  LastExportDate = 'lastExportDate',
  DoNotShowAgainUnsupportedEditors = 'doNotShowAgainUnsupportedEditors',
}

export const LAST_EXPORT_DATE_KEY = 'LastExportDateKey';
const PREFS_KEY = 'preferences';

export class PreferencesManager extends ApplicationService {
  private userPreferences!: Record<PrefKey, any>;
  private loadingPrefs = false;
  private unubscribeStreamItems?: () => void;

  /** @override */
  async onAppLaunch() {
    super.onAppLaunch();
    this.loadPreferences();
  }

  deinit() {
    this.unubscribeStreamItems && this.unubscribeStreamItems();
  }

  get mobileApplication() {
    return this.application as MobileApplication;
  }

  private async loadPreferences() {
    if (this.loadingPrefs) {
      return;
    }
    const preferences = await this.application.getValue(PREFS_KEY);
    this.userPreferences = preferences ?? {};
  }

  private async saveSingleton() {
    return this.application.setValue(PREFS_KEY, this.userPreferences);
  }

  getValue(key: PrefKey, defaultValue?: any) {
    if (!this.userPreferences) {
      return defaultValue;
    }
    const value = this.userPreferences[key];
    return !isNullOrUndefined(value) ? value : defaultValue;
  }

  async setUserPrefValue(key: PrefKey, value: any) {
    this.userPreferences[key] = value;
    await this.saveSingleton();
  }
}

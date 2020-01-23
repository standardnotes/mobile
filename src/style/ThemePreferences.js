import { SFItemParams } from 'standard-file-js';
import UserPrefsManager from '@Lib/userPrefsManager';
import Storage from '@SFJS/storageManager';
import StyleKit from '@Style/StyleKit';
import {
  LIGHT_MODE_KEY,
  DARK_MODE_KEY
} from '@Style/utils';

const THEME_PREFERENCES_KEY             = 'ThemePreferencesKey';
const LIGHT_THEME_KEY                   = 'lightTheme';
const DARK_THEME_KEY                    = 'darkTheme';

function getThemeKeyForMode(mode) {
  return mode === LIGHT_MODE_KEY ? LIGHT_THEME_KEY : DARK_THEME_KEY;
}

export default class ThemePreferences {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new ThemePreferences();
    }

    return this.instance;
  }

  constructor() {
    this.data = null;

    this.runPendingMigrations();
  }

  async runPendingMigrations() {
    const themePrefMigrationName = '01212020SavedThemePref';
    if((await Storage.get().getItem(themePrefMigrationName)) == null) {
      console.log("Running migration", themePrefMigrationName);
      await this.migrateThemePrefForModes();
      await Storage.get().setItem(themePrefMigrationName, 'true');
    }
  }

  async migrateThemePrefForModes() {
    const savedSystemThemeIdKey = "savedSystemThemeId";
    const savedThemeKey = "savedTheme";
    const systemThemeId = await Storage.get().getItem(systemThemeId);
    const savedTheme = await Storage.get().getItem(savedThemeKey);

    let themeData;
    if(savedTheme) {
      themeData = savedTheme;
    } else if(systemThemeId) {
      const systemTheme = _.find(
        StyleKit.get().systemThemes,
        { uuid: systemThemeId }
      );

      themeData = this.buildThemeDataForTheme(systemTheme);
    }

    if(!themeData) {
      this.data = await this.buildDefaultPreferences();
    } else {
      this.data = {
        [LIGHT_THEME_KEY]: themeData,
        [DARK_THEME_KEY]: themeData
      }
    }

    await UserPrefsManager.get().setPref({
      key: THEME_PREFERENCES_KEY,
      value: this.data
    });

    await UserPrefsManager.get().clearPref({ key: savedSystemThemeIdKey });
    await UserPrefsManager.get().clearPref({ key: savedThemeKey });
  }

  getPrefUuidForMode(mode) {
    const pref = this.getPrefForMode(mode);
    return pref && pref.uuid;
  }

  isPrefForMode({ mode, theme }) {
    const pref = this.getPrefForMode(mode);
    return pref.uuid === theme.uuid;
  }

  getPrefForMode(mode) {
    return this.data[getThemeKeyForMode(mode)];
  }

  async setPrefForMode({ mode, theme }) {
    const themeData = await this.buildThemeDataForTheme(theme);

    this.data[getThemeKeyForMode(mode)] = themeData;

    this.saveToStorage();
  }

  async buildDefaultPreferences() {
    const theme = StyleKit.get().systemThemes[0];
    const themeData = await this.buildThemeDataForTheme(theme);

    return {
      [LIGHT_THEME_KEY]: themeData,
      [DARK_THEME_KEY]: themeData
    }
  }

  async buildThemeDataForTheme(theme) {
    const transformer = new SFItemParams(theme);
    return await transformer.paramsForLocalStorage();
  }

  async loadFromStorage() {
    this.data = await UserPrefsManager.get().getPref({
      key: THEME_PREFERENCES_KEY
    });

    if(!this.data) {
      this.data = await this.buildDefaultPreferences();
    }

    return this.data;
  }

  saveToStorage() {
    if(this.saveAction) clearTimeout(this.saveAction);

    this.saveAction = setTimeout(async () => {
      await UserPrefsManager.get().setPref({
        key: THEME_PREFERENCES_KEY,
        value: this.data
      });
    }, 250);
  }
}

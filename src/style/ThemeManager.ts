import { SFItemParams, SNTheme as SNJSTheme } from 'snjs';
import _ from 'lodash';
import UserPrefsManager from '@Lib/userPrefsManager';
import { isNullOrUndefined } from '@Lib/utils';
import Storage from '@Lib/snjs/storageManager';
import StyleKit from '@Style/StyleKit';
import { LIGHT_MODE_KEY } from '@Style/utils';
import { Mode } from 'react-native-dark-mode';

const THEME_PREFERENCES_KEY = 'ThemePreferencesKey';
const LIGHT_THEME_KEY = 'lightTheme';
const DARK_THEME_KEY = 'darkTheme';

function getThemeKeyForMode(mode: Mode) {
  return mode === LIGHT_MODE_KEY ? LIGHT_THEME_KEY : DARK_THEME_KEY;
}

type SNTheme = typeof SNJSTheme;

type ThemeManagerData = {
  [LIGHT_THEME_KEY]: any;
  [DARK_THEME_KEY]: any;
};

export default class ThemeManager {
  private static instance: ThemeManager;
  data: ThemeManagerData | null = null;
  saveAction: any;

  static get() {
    if (isNullOrUndefined(this.instance)) {
      this.instance = new ThemeManager();
    }
    return this.instance;
  }

  async initialize() {
    await this.runPendingMigrations();
  }

  async runPendingMigrations() {
    const themePrefMigrationName = '01212020SavedThemePref';
    if (
      isNullOrUndefined(await Storage.get().getItem(themePrefMigrationName))
    ) {
      console.log('Running migration', themePrefMigrationName);
      await this.migrateThemePrefForModes();
      await Storage.get().setItem(themePrefMigrationName, 'true');
    }
  }

  async migrateThemePrefForModes() {
    const savedSystemThemeIdKey = 'savedSystemThemeId';
    const savedThemeKey = 'savedTheme';
    const systemThemeId = await Storage.get().getItem(savedSystemThemeIdKey);
    const savedTheme = await Storage.get().getItem(savedThemeKey);

    let themeData;
    if (savedTheme) {
      themeData = JSON.parse(savedTheme);
    } else if (systemThemeId) {
      const systemTheme = _.find(StyleKit.get().systemThemes, {
        uuid: systemThemeId
      });
      themeData = this.buildThemeDataForTheme(systemTheme);
    }

    if (!themeData) {
      this.data = await this.buildDefaultPreferences();
    } else {
      this.data = {
        [LIGHT_THEME_KEY]: themeData,
        [DARK_THEME_KEY]: themeData
      };
    }

    await UserPrefsManager.get().setPref({
      key: THEME_PREFERENCES_KEY,
      value: this.data
    });

    await UserPrefsManager.get().clearPref({ key: savedSystemThemeIdKey });
    await UserPrefsManager.get().clearPref({ key: savedThemeKey });
  }

  getThemeUuidForMode(mode: Mode) {
    const pref = this.getThemeForMode(mode);
    return pref && pref.uuid;
  }

  isThemeEnabledForMode({ mode, theme }: { mode: Mode; theme: SNTheme }) {
    const pref = this.getThemeForMode(mode);
    return pref.uuid === theme.uuid;
  }

  getThemeForMode(mode: Mode) {
    return this.data![getThemeKeyForMode(mode)];
  }

  async setThemeForMode({ mode, theme }: { mode: Mode; theme: SNTheme }) {
    const themeData = await this.buildThemeDataForTheme(theme);
    this.data![getThemeKeyForMode(mode)] = themeData;
    this.saveToStorage();
  }

  async buildDefaultPreferences() {
    const theme = StyleKit.get().systemThemes[0];
    const themeData = await this.buildThemeDataForTheme(theme);
    return {
      [LIGHT_THEME_KEY]: themeData,
      [DARK_THEME_KEY]: themeData
    };
  }

  async buildThemeDataForTheme(theme: SNTheme) {
    const transformer = new SFItemParams(theme);
    return transformer.paramsForLocalStorage();
  }

  async loadFromStorage() {
    this.data = await UserPrefsManager.get().getPref({
      key: THEME_PREFERENCES_KEY
    });
    if (!this.data) {
      this.data = await this.buildDefaultPreferences();
    }
    return this.data;
  }

  saveToStorage() {
    if (this.saveAction) {
      clearTimeout(this.saveAction);
    }
    this.saveAction = setTimeout(async () => {
      await UserPrefsManager.get().setPref({
        key: THEME_PREFERENCES_KEY,
        value: this.data
      });
    }, 250);
  }
}

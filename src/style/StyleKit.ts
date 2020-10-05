import { MobileApplication } from '@Lib/application';
import { ComponentManager } from '@Lib/component_manager';
import CSSParser from '@Style/css_parser';
import {
  DARK_CONTENT,
  getColorLuminosity,
  keyboardColorForTheme,
  LIGHT_CONTENT,
  statusBarColorForTheme,
} from '@Style/utils';
import React from 'react';
import {
  Alert,
  Appearance,
  Platform,
  StatusBar,
  TextStyle,
  ViewStyle,
} from 'react-native';
import {
  ApplicationEvent,
  ContentType,
  CopyPayload,
  CreateMaxPayloadFromAnyObject,
  FillItemContent,
  removeFromArray,
  SNTheme,
  StorageValueModes,
} from 'snjs';
import { RawPayload } from 'snjs/dist/@types/protocol/payloads/generator';
import { UuidString } from 'snjs/dist/@types/types';
import THEME_DARK_JSON from './Themes/blue-dark.json';
import THEME_BLUE_JSON from './Themes/blue.json';
import THEME_RED_JSON from './Themes/red.json';
import { StyleKitTheme } from './Themes/styled-components';

const LIGHT_THEME_KEY = 'lightThemeKey';
const DARK_THEME_KEY = 'darkThemeKey';
const CACHED_THEMES_KEY = 'cachedThemesKey';

type ThemeChangeObserver = () => Promise<void> | void;

type MobileThemeContent = {
  variables: StyleKitTheme;
  isSystemTheme: boolean;
  isInitial: boolean;
  luminosity: number;
  isSwapIn?: boolean;
};

export class MobileTheme extends SNTheme {
  get mobileContent() {
    return (this.safeContent as any) as MobileThemeContent;
  }

  static BuildTheme(variables?: StyleKitTheme) {
    return new MobileTheme(
      CreateMaxPayloadFromAnyObject({
        uuid: `${Math.random()}`,
        content_type: ContentType.Theme,
        content: FillItemContent({
          variables: variables || ({} as StyleKitTheme),
          isSystemTheme: false,
          isInitial: false,
        } as MobileThemeContent),
      })
    );
  }
}

enum SystemThemeTint {
  Blue = 'Blue',
  Dark = 'Dark',
  Red = 'Red',
}

export const StyleKitContext = React.createContext<StyleKit | undefined>(
  undefined
);

export class StyleKit {
  observers: ThemeChangeObserver[] = [];
  private themes: Record<UuidString, MobileTheme> = {};
  activeThemeId?: string;
  static constants = {
    mainTextFontSize: 16,
    paddingLeft: 14,
  };
  styles: Record<string, ViewStyle | TextStyle> = {};
  variables?: StyleKitTheme;
  application: MobileApplication;
  unregisterComponentHandler?: () => void;
  unsubscribeStreamThemes?: () => void;
  unsubsribeAppEventObserver?: () => void;

  constructor(application: MobileApplication) {
    this.application = application;
    this.buildSystemThemesAndData();
    this.registerObservers();
  }

  async init() {
    await this.loadCachedThemes();
    await this.resolveInitialThemeForMode();
    Appearance.addChangeListener(this.onColorSchemeChange.bind(this));
  }

  deinit() {
    Appearance.removeChangeListener(this.onColorSchemeChange.bind(this));
    this.unregisterComponentHandler && this.unregisterComponentHandler();
    this.unsubscribeStreamThemes && this.unsubscribeStreamThemes();
    this.unsubsribeAppEventObserver && this.unsubsribeAppEventObserver();
  }

  private registerObservers() {
    this.unsubsribeAppEventObserver = this.application.addEventObserver(
      async event => {
        /**
         * If there are any migrations we need to set default theme to start UI
         */
        if (event === ApplicationEvent.MigrationsLoaded) {
          if (await this.application.hasPendingMigrations()) {
            this.setDefaultTheme();
          }
        }
        if (event === ApplicationEvent.Launched) {
          // Resolve initial theme after app launched
          this.resolveInitialThemeForMode();
        }
      }
    );
  }

  private findOrCreateTheme(themeId: string, variables?: StyleKitTheme) {
    let theme = this.themes[themeId];
    if (!theme) {
      theme = this.buildTheme(undefined, variables);
      this.addTheme(theme);
    }
    return theme;
  }

  private buildSystemThemesAndData() {
    const themeData = [
      {
        uuid: SystemThemeTint.Blue,
        variables: THEME_BLUE_JSON,
        name: SystemThemeTint.Blue,
        isInitial: this.getColorScheme() === 'light',
      },
      {
        uuid: SystemThemeTint.Dark,
        variables: THEME_DARK_JSON,
        name: SystemThemeTint.Dark,
        isInitial: this.getColorScheme() === 'dark',
      },
      {
        uuid: SystemThemeTint.Red,
        variables: THEME_RED_JSON,
        name: SystemThemeTint.Red,
      },
    ];

    for (const option of themeData) {
      const variables: StyleKitTheme = {
        ...option.variables,
        ...StyleKit.constants,
      };
      variables.statusBar =
        Platform.OS === 'android' ? LIGHT_CONTENT : DARK_CONTENT;

      const payload = CreateMaxPayloadFromAnyObject({
        uuid: option.uuid,
        content_type: ContentType.Theme,
        content: FillItemContent({
          package_info: {
            dock_icon: {
              type: 'circle',
              background_color: variables.stylekitInfoColor,
              border_color: variables.stylekitInfoColor,
            },
          },
          name: option.name,
          variables,
          luminosity: getColorLuminosity(
            variables.stylekitContrastBackgroundColor
          ),
          isSystemTheme: true,
          isInitial: Boolean(option.isInitial),
        } as MobileThemeContent),
      });
      const theme = new MobileTheme(payload);
      this.addTheme(theme);
    }
  }

  addTheme(theme: MobileTheme) {
    this.themes[theme.uuid] = theme;
  }

  public getActiveTheme() {
    return this.activeThemeId && this.themes[this.activeThemeId];
  }

  private onColorSchemeChange() {
    this.resolveInitialThemeForMode();
  }

  /**
   * Returns color scheme or light scheme as a default
   */
  private getColorScheme() {
    return Appearance.getColorScheme() || 'light';
  }

  /**
   * Registers an observer for theme change
   * @returns function that unregisters this observer
   */
  public addThemeChangeObserver(callback: ThemeChangeObserver) {
    this.observers.push(callback);
    return () => {
      removeFromArray(this.observers, callback);
    };
  }

  notifyObserversOfThemeChange() {
    for (const observer of this.observers) {
      observer();
    }
  }

  public async assignExternalThemeForMode(
    theme: SNTheme,
    mode: 'light' | 'dark'
  ) {
    const data = this.findOrCreateTheme(theme.uuid);
    if (!data.hasOwnProperty('variables')) {
      if ((await this.downloadThemeAndReload(theme)) === false) {
        return;
      }
    }
    this.assignThemeForMode(theme.uuid, mode);
  }

  public async assignThemeForMode(themeId: string, mode: 'light' | 'dark') {
    this.setThemeForMode(mode, themeId);

    /**
     * If we're changing the theme for a specific mode and we're currently on
     * that mode, then activate this theme.
     */
    if (this.getColorScheme() === mode && this.activeThemeId !== themeId) {
      this.activateTheme(themeId);
    }
  }

  private async setThemeForMode(mode: 'light' | 'dark', themeId: string) {
    return this.application.setValue(
      mode === 'dark' ? DARK_THEME_KEY : LIGHT_THEME_KEY,
      themeId,
      StorageValueModes.Nonwrapped
    );
  }

  public async getThemeForMode(mode: 'light' | 'dark') {
    return this.application.getValue(
      mode === 'dark' ? DARK_THEME_KEY : LIGHT_THEME_KEY,
      StorageValueModes.Nonwrapped
    );
  }

  /**
   * When downloading an external theme, we can't depend on it having all the
   * variables present. So we will merge them with this template variable list
   * to make sure the end result has all variables the app expects. Return a
   * copy as the result may be modified before use.
   */
  templateVariables() {
    return Object.assign({}, THEME_BLUE_JSON) as StyleKitTheme;
  }

  private setDefaultTheme() {
    const defaultThemeId =
      this.getColorScheme() === 'dark'
        ? SystemThemeTint.Dark
        : SystemThemeTint.Blue;

    this.setActiveTheme(defaultThemeId);
  }

  private async resolveInitialThemeForMode() {
    try {
      const savedThemeId = await this.getThemeForMode(this.getColorScheme());
      const matchingThemeId = Object.keys(this.themes).find(
        themeId => themeId === savedThemeId
      );
      if (matchingThemeId) {
        this.setActiveTheme(matchingThemeId);
      } else {
        this.setDefaultTheme();
      }
    } catch (e) {
      console.error('Error parsing initial theme', e);
      return this.setDefaultTheme();
    }
  }

  keyboardColorForActiveTheme() {
    return keyboardColorForTheme(this.findOrCreateTheme(this.activeThemeId!));
  }

  systemThemes() {
    return Object.values(this.themes)
      .filter(theme => theme.mobileContent.isSystemTheme)
      .sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });
  }

  nonSystemThemes() {
    return Object.values(this.themes)
      .filter(theme => !theme.mobileContent.isSystemTheme)
      .sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });
  }

  private buildTheme(base?: MobileTheme, baseVariables?: StyleKitTheme) {
    const theme = base || MobileTheme.BuildTheme();
    /** Merge default variables to ensure this theme has all the variables. */
    const variables = {
      ...this.templateVariables(),
      ...theme.mobileContent.variables,
      ...baseVariables,
    };
    const luminosity =
      theme.mobileContent.luminosity ||
      getColorLuminosity(variables.stylekitContrastBackgroundColor);
    return new MobileTheme(
      CopyPayload(theme.payload, {
        content: {
          ...theme.mobileContent,
          variables,
          luminosity,
        } as MobileThemeContent,
      })
    );
  }

  setActiveTheme(themeId: string) {
    const theme = this.findOrCreateTheme(themeId);
    const updatedTheme = this.buildTheme(theme);
    this.addTheme(updatedTheme);
    this.variables = updatedTheme.mobileContent.variables;
    (this.application
      .componentManager as ComponentManager).setMobileActiveTheme(updatedTheme);
    this.activeThemeId = themeId;
    this.updateDeviceForTheme(themeId);
    this.notifyObserversOfThemeChange();
  }

  /**
   * Updates local device items for newly activated theme.
   *
   * This includes:
   *     - Status Bar color
   */
  private updateDeviceForTheme(themeId: string) {
    const theme = this.findOrCreateTheme(themeId);
    const isAndroid = Platform.OS === 'android';
    /** On Android, a time out is required, especially during app startup. */
    setTimeout(
      () => {
        const statusBarColor = statusBarColorForTheme(theme);
        StatusBar.setBarStyle(statusBarColor, true);

        if (isAndroid) {
          /**
           * Android <= v22 does not support changing status bar text color.
           * It will always be white, so we have to make sure background color
           * has proper contrast.
           */
          if (Platform.Version <= 22) {
            StatusBar.setBackgroundColor('#000000');
          } else {
            StatusBar.setBackgroundColor(
              theme.mobileContent.variables.stylekitContrastBackgroundColor
            );
          }
        }
      },
      isAndroid ? 100 : 0
    );
  }

  private async downloadTheme(theme: SNTheme) {
    let errorBlock = (error: null) => {
      console.error('Theme download error', error);
    };

    let url = theme.hosted_url;

    if (!url) {
      errorBlock(null);
      return;
    }

    if (Platform.OS === 'android' && url.includes('localhost')) {
      url = url.replace('localhost', '10.0.2.2');
    }

    return new Promise(async resolve => {
      try {
        const response = await fetch(url, {
          method: 'GET',
        });
        const data = await response.text();
        let variables = CSSParser.cssToObject(data);

        resolve(variables);
      } catch (e) {
        resolve(null);
      }
    });
  }

  activateSystemTheme(themeId: string) {
    this.activateTheme(themeId);
  }

  async activateExternalTheme(theme: SNTheme) {
    const existing = this.themes[theme.uuid];
    if (existing && existing.mobileContent.variables) {
      this.activateTheme(theme.uuid);
      return;
    }
    const variables = await this.downloadTheme(theme);
    if (!variables) {
      Alert.alert('Not Available', 'This theme is not available on mobile.');
      return;
    }
    const appliedVariables = Object.assign(this.templateVariables(), variables);
    const finalVariables = {
      ...appliedVariables,
      ...StyleKit.constants,
    };
    const mobileTheme = new MobileTheme(
      CreateMaxPayloadFromAnyObject(theme.payload, {
        content: {
          ...theme.payload.safeContent,
          variables: finalVariables,
          luminosity: getColorLuminosity(
            finalVariables.stylekitContrastBackgroundColor
          ),
          isSystemTheme: false,
          isInitial: false,
          package_info: {
            dock_icon: {
              type: 'circle',
              background_color: finalVariables.stylekitInfoColor,
              border_color: finalVariables.stylekitInfoColor,
            },
          },
        } as MobileThemeContent,
      })
    );
    this.addTheme(mobileTheme);
    this.activateTheme(theme.uuid);
    this.cacheThemes();
  }

  private activateTheme(themeId: string) {
    this.setActiveTheme(themeId);
    this.assignThemeForMode(themeId, this.getColorScheme());
  }

  private async loadCachedThemes() {
    const rawValue =
      (await this.application!.getValue(
        CACHED_THEMES_KEY,
        StorageValueModes.Nonwrapped
      )) || [];
    const themes = rawValue.map((rawPayload: RawPayload) => {
      const payload = CreateMaxPayloadFromAnyObject(rawPayload);
      return new MobileTheme(payload);
    });
    for (const theme of themes) {
      this.addTheme(theme);
    }
  }

  private async cacheThemes() {
    const themes = this.nonSystemThemes();
    return this.application!.setValue(
      CACHED_THEMES_KEY,
      themes.map(t => t.payloadRepresentation()),
      StorageValueModes.Nonwrapped
    );
  }

  private async decacheThemes() {
    if (this.application) {
      return this.application.removeValue(
        CACHED_THEMES_KEY,
        StorageValueModes.Nonwrapped
      );
    }
  }

  public async downloadThemeAndReload(theme: SNTheme) {
    const variables = await this.downloadTheme(theme);
    if (!variables) {
      return false;
    }
    /** Merge default variables to ensure this theme has all the variables. */
    const appliedVariables = Object.assign(this.templateVariables(), variables);
    const mobileTheme = this.findOrCreateTheme(theme.uuid, {
      ...appliedVariables,
      ...StyleKit.constants,
    });
    this.addTheme(mobileTheme);
    this.cacheThemes();
    if (theme.uuid === this.activeThemeId) {
      this.setActiveTheme(theme.uuid);
    }
    return true;
  }

  static doesDeviceSupportDarkMode() {
    /**
     * Android supportsDarkMode relies on a Configuration value in the API
     * that was not available until Android 8.0 (26)
     * https://developer.android.com/reference/android/content/res/Configuration#UI_MODE_NIGHT_UNDEFINED
     * iOS supports Dark mode from iOS 13
     */

    if (Platform.OS === 'android' && Platform.Version < 26) {
      return false;
    } else if (Platform.OS === 'ios') {
      const majorVersionIOS = parseInt(Platform.Version as string, 10);
      return majorVersionIOS >= 13;
    }

    return true;
  }

  static platformIconPrefix() {
    return Platform.OS === 'android' ? 'md' : 'ios';
  }

  static nameForIcon(iconName: string) {
    return StyleKit.platformIconPrefix() + '-' + iconName;
  }
}

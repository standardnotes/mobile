import { StatusBar, Alert, Platform, ViewStyle, TextStyle } from 'react-native';
import IconChanger from 'react-native-alternate-icons';
import { supportsDarkMode, Mode } from 'react-native-dark-mode';
import _ from 'lodash';
import Auth from '@Lib/snjs/authManager';
import ModelManager from '@Lib/snjs/modelManager';
import Sync from '@Lib/snjs/syncManager';
import ThemeManager from '@Style/ThemeManager';
import {
  statusBarColorForTheme,
  keyboardColorForTheme,
  LIGHT_CONTENT,
  DARK_CONTENT,
  LIGHT_MODE_KEY
} from '@Style/utils';
import ThemeDownloader from '@Style/Util/ThemeDownloader';
import { SFAuthManager, SNTheme as SNJSTheme } from 'snjs';

import THEME_RED_JSON from './Themes/red.json';
import THEME_BLUE_JSON from './Themes/blue.json';

type SNTheme = typeof SNJSTheme;

export default class StyleKit {
  private static instance: StyleKit;
  themeChangeObservers: Array<() => void>;
  activeTheme: SNTheme;
  mode?: Mode;
  currentDarkMode!: Mode;
  systemThemes: Array<SNTheme>;
  constants: { mainTextFontSize: number; paddingLeft: number };
  styles: Record<string, ViewStyle | TextStyle> = {};
  signoutObserver: any;

  static get() {
    if (!this.instance) {
      this.instance = new StyleKit();
    }

    return this.instance;
  }

  constructor() {
    this.themeChangeObservers = [];
    this.systemThemes = [];

    this.constants = {
      mainTextFontSize: 16,
      paddingLeft: 14
    };

    this.buildDefaultThemes();

    ModelManager.get().addItemSyncObserver(
      'themes',
      'SN|Theme',
      (_allItems: any, _validItems: any, deletedItems: any, _source: any) => {
        if (
          this.activeTheme &&
          !this.activeTheme.isSystemTheme &&
          this.activeTheme.isSwapIn
        ) {
          const match = _.find(this.themes(), { uuid: this.activeTheme.uuid });
          if (match) {
            this.setActiveTheme(match);
            this.activeTheme.isSwapIn = false;
          }
        }

        const activeUuid = this.activeTheme.uuid;
        for (const theme of deletedItems) {
          if (activeUuid === theme.uuid) {
            this.resetToSystemTheme();
            return;
          }
        }
      }
    );

    this.signoutObserver = Auth.get().addEventHandler((event: any) => {
      if (event === SFAuthManager.DidSignOutEvent) {
        this.resetToSystemTheme();
      }
    });
  }

  async initialize() {
    await ThemeManager.get().initialize();
    await this.resolveInitialTheme();
  }

  setModeTo(mode: Mode) {
    this.currentDarkMode = mode;
  }

  addThemeChangeObserver(observer: () => void) {
    this.themeChangeObservers.push(observer);
    return observer;
  }

  removeThemeChangeObserver(observer: () => void) {
    _.pull(this.themeChangeObservers, observer);
  }

  notifyObserversOfThemeChange() {
    for (const observer of this.themeChangeObservers) {
      observer();
    }
  }

  assignThemeForMode({ theme, mode }: { theme: SNTheme; mode: Mode }) {
    if (!StyleKit.doesDeviceSupportDarkMode()) {
      mode = LIGHT_MODE_KEY;
    }

    ThemeManager.get().setThemeForMode({ mode: mode, theme: theme });

    /**
     * If we're changing the theme for a specific mode and we're currently on
     * that mode, then activate this theme.
     */
    if (this.currentDarkMode === mode && this.activeTheme.uuid !== theme.uuid) {
      this.activateTheme(theme);
    }
  }

  /**
   * When downloading an external theme, we can't depend on it having all the
   * variables present. So we will merge them with this template variable list
   * to make sure the end result has all variables the app expects. Return a
   * copy as the result may be modified before use.
   */
  templateVariables() {
    return _.clone(THEME_RED_JSON);
  }

  buildDefaultThemes() {
    this.systemThemes = [];
    const options = [
      {
        variables: THEME_BLUE_JSON,
        name: 'Blue',
        isInitial: true
      },
      {
        variables: THEME_RED_JSON,
        name: 'Red'
      }
    ];

    for (const option of options) {
      const variables = option.variables;
      variables.statusBar =
        Platform.OS === 'android' ? LIGHT_CONTENT : DARK_CONTENT;

      const theme = new SNJSTheme({
        uuid: option.name,
        content: {
          isSystemTheme: true,
          isInitial: option.isInitial,
          name: option.name,
          variables: variables,
          package_info: {
            dock_icon: {
              type: 'circle',
              background_color: variables.stylekitInfoColor,
              border_color: variables.stylekitInfoColor
            }
          }
        }
      });

      this.systemThemes.push(theme);
    }
  }

  /**
   * @private
   */
  resetToSystemTheme() {
    this.activateTheme(this.systemThemes[0]);
  }

  async resolveInitialTheme() {
    const currentMode = this.currentDarkMode;
    const runDefaultTheme = () => {
      const defaultTheme = this.systemThemes[0];

      ThemeManager.get().setThemeForMode({
        mode: currentMode,
        theme: defaultTheme
      });

      this.setActiveTheme(defaultTheme);
    };

    await ThemeManager.get().loadFromStorage();

    const themeData = ThemeManager.get().getThemeForMode(currentMode);
    if (!themeData) {
      return runDefaultTheme();
    }

    try {
      const matchingTheme = _.find(this.systemThemes, { uuid: themeData.uuid });
      let newTheme;

      /** Use latest app theme data if preference is a previous system theme. */
      if (matchingTheme) {
        newTheme = matchingTheme;
      } else {
        newTheme = new SNJSTheme(themeData);
        newTheme.isSwapIn = true;
      }

      this.setActiveTheme(newTheme);
    } catch (e) {
      console.error('Error parsing initial theme', e);
      return runDefaultTheme();
    }
  }

  keyboardColorForActiveTheme() {
    return keyboardColorForTheme(this.activeTheme);
  }

  themes() {
    const themes = ModelManager.get().themes.sort(
      (
        a: { name: { toLowerCase: () => number } },
        b: { name: { toLowerCase: () => number } }
      ) => {
        if (!a.name || !b.name) {
          return -1;
        }
        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      }
    );
    return this.systemThemes.concat(themes);
  }

  isThemeActive(theme: SNTheme) {
    return this.activeTheme && theme.uuid === this.activeTheme.uuid;
  }

  setActiveTheme(theme: SNTheme) {
    /** Merge default variables to ensure this theme has all the variables. */
    const variables = theme.content.variables;
    theme.content.variables = _.merge(this.templateVariables(), variables);

    this.activeTheme = theme;

    this.updateDeviceForTheme(theme);

    this.reloadStyles();

    this.notifyObserversOfThemeChange();
  }

  /**
   * Updates local device items for newly activated theme.
   *
   * This includes:
   *     - Status Bar color
   *     - Local App Icon color
   */
  updateDeviceForTheme(theme: SNTheme) {
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
              theme.content.variables.stylekitContrastBackgroundColor
            );
          }
        }
      },
      isAndroid ? 100 : 0
    );

    if (theme.content.isSystemTheme && !isAndroid) {
      IconChanger.supportDevice((supported) => {
        if (supported) {
          IconChanger.getIconName((currentName) => {
            if (theme.content.isInitial && currentName !== 'default') {
              /** Clear the icon to default. */
              IconChanger.setIconName(null);
            } else {
              const newName = theme.content.name;
              if (newName !== currentName) {
                IconChanger.setIconName(newName);
              }
            }
          });
        }
      });
    }
  }

  activateTheme(theme: {
    content: { variables: { stylekitInfoColor: any } };
    setDirty: (arg0: boolean) => void;
    getNotAvailOnMobile: () => any;
    setNotAvailOnMobile: (arg0: boolean) => void;
  }) {
    const performActivation = () => {
      this.setActiveTheme(theme);
      this.assignThemeForMode({ theme: theme, mode: this.currentDarkMode });
    };

    /**
     * Update theme with StyleKit changes if the user has an old version.
     */
    const hasValidInfoColor =
      theme.content.variables && theme.content.variables.stylekitInfoColor;

    if (!hasValidInfoColor) {
      ThemeDownloader.get()
        .downloadTheme(theme)
        .then((variables: any) => {
          if (!variables) {
            Alert.alert(
              'Not Available',
              'This theme is not available on mobile.'
            );
            return;
          }

          if (variables !== theme.content.variables) {
            theme.content.variables = variables;
            theme.setDirty(true);
          }

          if (theme.getNotAvailOnMobile()) {
            theme.setNotAvailOnMobile(false);
            theme.setDirty(true);
          }

          Sync.get().sync();
          performActivation();
        });
    } else {
      performActivation();
    }
  }

  activatePreferredTheme() {
    const uuid = ThemeManager.get().getThemeUuidForMode(this.currentDarkMode);
    const matchingTheme = _.find(this.themes(), { uuid: uuid });

    if (matchingTheme) {
      if (matchingTheme.uuid === this.activeTheme.uuid) {
        /** Found a match and it's already active, no need to switch. */
        return;
      }

      /** found a matching theme for user preference, switch to that theme. */
      this.activateTheme(matchingTheme);
    } else {
      /** No matching theme found, set currently active theme as the default. */
      this.assignThemeForMode({
        theme: this.activeTheme,
        mode: this.currentDarkMode
      });
    }
  }

  async downloadThemeAndReload(theme: {
    content: {
      package_info: { no_mobile: any };
      isSystemTheme: any;
      variables: any;
    };
    name?: any;
    setDirty: (arg0: boolean) => void;
    uuid?: any;
  }) {
    const updatedVariables = await ThemeDownloader.get().downloadTheme(theme);

    /** Merge default variables to ensure this theme has all the variables. */
    const appliedVariables = _.merge(
      this.templateVariables(),
      updatedVariables
    );
    theme.content.variables = appliedVariables;
    theme.setDirty(true);

    await Sync.get().sync();

    if (theme.uuid === this.activeTheme.uuid) {
      this.setActiveTheme(theme);
    }
  }

  reloadStyles() {
    const { variables } = this.activeTheme.content;
    const { mainTextFontSize, paddingLeft } = this.constants;
    this.styles = {
      baseBackground: {
        backgroundColor: variables.stylekitBackgroundColor
      },
      contrastBackground: {
        backgroundColor: variables.stylekitContrastBackgroundColor
      },
      container: {
        flex: 1,
        height: '100%'
      },

      flexContainer: {
        flex: 1,
        flexDirection: 'column'
      },

      centeredContainer: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      },

      flexedItem: {
        flexGrow: 1
      },

      uiText: {
        color: variables.stylekitForegroundColor,
        fontSize: mainTextFontSize
      },

      view: {},

      contrastView: {},

      tableSection: {
        marginTop: 10,
        marginBottom: 10,
        backgroundColor: variables.stylekitBackgroundColor
      },

      sectionedTableCell: {
        borderBottomColor: variables.stylekitBorderColor,
        borderBottomWidth: 1,
        paddingLeft: paddingLeft,
        paddingRight: paddingLeft,
        paddingTop: 13,
        paddingBottom: 12,
        backgroundColor: variables.stylekitBackgroundColor
      },

      textInputCell: {
        maxHeight: 50,
        paddingTop: 0,
        paddingBottom: 0
      },

      sectionedTableCellTextInput: {
        fontSize: mainTextFontSize,
        padding: 0,
        color: variables.stylekitForegroundColor,
        height: '100%'
      },

      sectionedTableCellFirst: {
        borderTopColor: variables.stylekitBorderColor,
        borderTopWidth: 1
      },

      sectionedTableCellLast: {},

      sectionedAccessoryTableCell: {
        paddingTop: 0,
        paddingBottom: 0,
        minHeight: 47,
        backgroundColor: 'transparent'
      },

      sectionedAccessoryTableCellLabel: {
        fontSize: mainTextFontSize,
        color: variables.stylekitForegroundColor,
        minWidth: '80%'
      },

      buttonCell: {
        paddingTop: 0,
        paddingBottom: 0,
        flex: 1,
        justifyContent: 'center'
      },

      buttonCellButton: {
        textAlign: 'center',
        textAlignVertical: 'center',
        color:
          Platform.OS === 'android'
            ? variables.stylekitForegroundColor
            : variables.stylekitInfoColor,
        fontSize: mainTextFontSize
      },

      buttonCellButtonLeft: {
        textAlign: 'left'
      },

      noteText: {
        flexGrow: 1,
        marginTop: 0,
        paddingTop: 10,
        color: variables.stylekitForegroundColor,
        paddingLeft: paddingLeft,
        paddingRight: paddingLeft,
        paddingBottom: 10,
        backgroundColor: variables.stylekitBackgroundColor
      },

      noteTextIOS: {
        paddingLeft: paddingLeft - 5,
        paddingRight: paddingLeft - 5
      },

      noteTextNoPadding: {
        paddingLeft: 0,
        paddingRight: 0
      },

      actionSheetWrapper: {},

      actionSheetOverlay: {
        /** This is the dimmed background */
        // backgroundColor: variables.stylekitNeutralColor
      },

      actionSheetBody: {
        /**
         * This will also set button border bottoms, since margin is used
         * instead of borders
         */
        backgroundColor: variables.stylekitBorderColor
      },

      actionSheetTitleWrapper: {
        backgroundColor: variables.stylekitBackgroundColor,
        marginBottom: 1
      },

      actionSheetTitleText: {
        color: variables.stylekitForegroundColor,
        opacity: 0.5
      },

      actionSheetButtonWrapper: {
        backgroundColor: variables.stylekitBackgroundColor,
        marginTop: 0
      },

      actionSheetButtonTitle: {
        color: variables.stylekitForegroundColor
      },

      actionSheetCancelButtonWrapper: {
        marginTop: 0
      },

      actionSheetCancelButtonTitle: {
        color: variables.stylekitInfoColor,
        fontWeight: 'normal'
      },

      bold: {
        fontWeight: 'bold'
      }
    };
  }

  static doesDeviceSupportDarkMode() {
    const isAndroid = Platform.OS === 'android';

    /**
     * Android supportsDarkMode relies on a Configuration value in the API
     * that was not available until Android 8.0 (26)
     * https://developer.android.com/reference/android/content/res/Configuration#UI_MODE_NIGHT_UNDEFINED
     */
    if (isAndroid && Platform.Version < 26) {
      return false;
    }

    return supportsDarkMode;
  }

  static variable(name: string) {
    return this.get().activeTheme.content.variables[name];
  }

  static get variables() {
    return this.get().activeTheme.content.variables;
  }

  static get constants() {
    return this.get().constants;
  }

  static get styles() {
    return this.get().styles;
  }

  static stylesForKey(key: string) {
    const allStyles = this.styles;
    const styles = [allStyles[key]];
    const platform = Platform.OS === 'android' ? 'Android' : 'IOS';
    const platformStyles = allStyles[key + platform];
    if (platformStyles) {
      styles.push(platformStyles);
    }
    return styles;
  }

  static platformIconPrefix() {
    return Platform.OS === 'android' ? 'md' : 'ios';
  }

  static nameForIcon(iconName: string) {
    return StyleKit.platformIconPrefix() + '-' + iconName;
  }
}

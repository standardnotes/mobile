import { MobileApplication } from '@Lib/application';
import ThemeDownloader from '@Style/Util/ThemeDownloader';
import {
  DARK_CONTENT,
  keyboardColorForTheme,
  LIGHT_CONTENT,
  statusBarColorForTheme,
} from '@Style/utils';
import _ from 'lodash';
import React from 'react';
import {
  Alert,
  Appearance,
  ColorSchemeName,
  Platform,
  StatusBar,
  TextStyle,
  ViewStyle,
} from 'react-native';
import IconChanger from 'react-native-alternate-icons';
import { removeFromArray, SNComponent, SNTheme } from 'snjs';
import { UuidString } from 'snjs/dist/@types/types';
import THEME_BLUE_JSON from './Themes/blue.json';
import THEME_RED_JSON from './Themes/red.json';
import { StyleKitTheme } from './Themes/styled-components';

type ThemeChangeObserver = () => Promise<void> | void;

export interface ThemeContent {
  isSystemTheme: boolean;
  isInitial: boolean;
  name: string;
  luminosity?: number;
  isSwapIn?: boolean;
  variables: StyleKitTheme;
  package_info: SNComponent['package_info'];
}

enum SystemThemes {
  Blue = 'Blue',
  Red = 'Red',
}

export const StyleKitContext = React.createContext<StyleKit | undefined>(
  undefined
);

export class StyleKit {
  observers: ThemeChangeObserver[] = [];
  private themeData: Partial<Record<UuidString, ThemeContent>> = {};
  activeTheme?: string;
  currentDarkMode: ColorSchemeName;
  modeChangeListener?: Appearance.AppearanceListener;
  private unsubState!: () => void;
  private unregisterComponent!: () => void;
  static constants = {
    mainTextFontSize: 16,
    paddingLeft: 14,
  };
  styles: Record<string, ViewStyle | TextStyle> = {};
  theme?: StyleKitTheme;
  application: MobileApplication;

  constructor(application: MobileApplication) {
    this.application = application;
    this.buildSystemThemesAndData();
  }

  async initialize() {
    await this.resolveInitialTheme();
    this.registerAppearanceChangeLister();
  }

  deinit() {
    Appearance.removeChangeListener(this.setModeTo.bind(this));
  }

  // onAppEvent(event: ApplicationEvent) {
  //   super.onAppEvent(event);
  //   if (event === ApplicationEvent.SignedOut) {
  //     this.resetToSystemTheme();
  //   }
  // }

  // private registerObservers() {
  //   this.unregisterComponent = this.application!.componentManager!.registerHandler(
  //     {
  //       identifier: 'themeManager',
  //       areas: [ComponentArea.Themes],
  //       activationHandler: component => {
  //         if (component.active) {
  //           this.activateExternalTheme(component as SNTheme);
  //         } else {
  //           this.activateTheme(SystemThemes.Blue);
  //         }
  //       },
  //     }
  //   );
  // }

  private registerAppearanceChangeLister() {
    Appearance.addChangeListener(this.setModeTo);
  }

  private findOrCreateDataForTheme(themeId: string) {
    let data = this.themeData[themeId];
    if (!data) {
      data = {} as ThemeContent;
      this.themeData[themeId] = data;
    }
    return data;
  }

  private buildSystemThemesAndData() {
    const themeData = [
      {
        variables: THEME_BLUE_JSON,
        name: SystemThemes.Blue,
        isInitial: true,
      },
      {
        variables: THEME_RED_JSON,
        name: SystemThemes.Red,
      },
    ];

    for (const option of themeData) {
      const variables: StyleKitTheme = {
        ...option.variables,
        ...StyleKit.constants,
      };
      variables.statusBar =
        Platform.OS === 'android' ? LIGHT_CONTENT : DARK_CONTENT;

      this.themeData[option.name] = {
        isSystemTheme: true,
        isInitial: Boolean(option.isInitial),
        name: option.name,
        variables: variables,
        package_info: {
          dock_icon: {
            type: 'circle',
            background_color: variables.stylekitInfoColor,
            border_color: variables.stylekitInfoColor,
          },
        },
      };
    }
  }

  setModeTo(preferences: Appearance.AppearancePreferences) {
    this.currentDarkMode = preferences.colorScheme;
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

  assignThemeForMode(themeId: string) {
    const currentMode = Appearance.getColorScheme() || 'light'; // set to light in case of no support for dark theme
    // TODO: Save theme to storage
    // ThemeManager.get().setThemeForMode({ mode: mode, theme: theme });

    /**
     * If we're changing the theme for a specific mode and we're currently on
     * that mode, then activate this theme.
     */
    if (this.currentDarkMode === currentMode && this.activeTheme !== themeId) {
      this.activateTheme(themeId);
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

  private resetToSystemTheme() {
    this.activateTheme(Object.keys(this.themeData)[0]);
  }

  async resolveInitialTheme() {
    // const currentMode = Appearance.getColorScheme();
    const runDefaultTheme = () => {
      const defaultTheme = SystemThemes.Blue;

      // TODO: save to starege

      this.setActiveTheme(defaultTheme);
    };

    // TODO: load from storage

    // TODO:  get theme for mode
    // const themeData = ThemeManager.get().getThemeForMode(currentMode);

    return runDefaultTheme();

    // try {
    //   const matchingTheme = _.find(this.systemThemes, { uuid: themeData.uuid });
    //   let newTheme;

    //   /** Use latest app theme data if preference is a previous system theme. */
    //   if (matchingTheme) {
    //     newTheme = matchingTheme;
    //   } else {
    //     newTheme = new SNTheme(themeData);
    //     newTheme.isSwapIn = true;
    //   }

    //   this.setActiveTheme(newTheme);
    // } catch (e) {
    //   console.error('Error parsing initial theme', e);
    //   return runDefaultTheme();
    // }
  }

  keyboardColorForActiveTheme() {
    return keyboardColorForTheme(
      this.findOrCreateDataForTheme(this.activeTheme!)
    );
  }

  themes() {
    // TODO: add external themes
    return this.themeData;
  }

  isThemeActive(theme: SNTheme) {
    return this.activeTheme && theme.uuid === this.activeTheme;
  }

  setActiveTheme(themeId: string) {
    /** Merge default variables to ensure this theme has all the variables. */
    const themeData = this.findOrCreateDataForTheme(themeId);
    const variables = themeData.variables;
    themeData.variables = _.merge(this.templateVariables(), variables);

    this.activeTheme = themeId;

    this.updateDeviceForTheme(themeId);

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
  updateDeviceForTheme(themeId: string) {
    const theme = this.findOrCreateDataForTheme(themeId);
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
              theme.variables.stylekitContrastBackgroundColor
            );
          }
        }
      },
      isAndroid ? 100 : 0
    );

    if (theme.isSystemTheme && !isAndroid) {
      IconChanger.supportDevice(supported => {
        if (supported) {
          IconChanger.getIconName(currentName => {
            if (theme.isInitial && currentName !== 'default') {
              /** Clear the icon to default. */
              IconChanger.setIconName(null);
            } else {
              const newName = theme.name;
              if (newName !== currentName) {
                IconChanger.setIconName(newName);
              }
            }
          });
        }
      });
    }
  }

  activateExternalTheme(theme: SNTheme) {
    ThemeDownloader.get()
      .downloadTheme(theme)
      .then(variables => {
        if (!variables) {
          Alert.alert(
            'Not Available',
            'This theme is not available on mobile.'
          );
          return;
        }
        // TODO: merge new theme style
        // if (variables !== theme.content.variables) {
        //   theme.content.variables = variables;
        //   theme.setDirty(true);
        // }
      });
    this.activateTheme(theme.uuid);
  }

  activateTheme(themeId: string) {
    this.setActiveTheme(themeId);
    this.assignThemeForMode(themeId);
  }

  // activatePreferredTheme() {
  //   const uuid = ThemeManager.get().getThemeUuidForMode(this.currentDarkMode);
  //   const matchingTheme = _.find(this.themes(), { uuid: uuid });

  //   if (matchingTheme) {
  //     if (matchingTheme.uuid === this.activeTheme.uuid) {
  //       /** Found a match and it's already active, no need to switch. */
  //       return;
  //     }

  //     /** found a matching theme for user preference, switch to that theme. */
  //     this.activateTheme(matchingTheme);
  //   } else {
  //     /** No matching theme found, set currently active theme as the default. */
  //     this.assignThemeForMode({
  //       theme: this.activeTheme,
  //       mode: this.currentDarkMode,
  //     });
  //   }
  // }

  async downloadThemeAndReload(theme: SNTheme) {
    const updatedVariables = await ThemeDownloader.get().downloadTheme(theme);

    /** Merge default variables to ensure this theme has all the variables. */
    const appliedVariables = _.merge(
      this.templateVariables(),
      updatedVariables
    );
    let data = this.findOrCreateDataForTheme(theme.uuid);
    data.variables = {
      ...appliedVariables,
      ...StyleKit.constants,
    };

    if (theme.uuid === this.activeTheme) {
      this.setActiveTheme(theme.uuid);
    }
  }

  reloadStyles() {
    const { variables } = this.findOrCreateDataForTheme(this.activeTheme!);
    const { mainTextFontSize, paddingLeft } = StyleKit.constants;

    this.theme = variables;

    this.styles = {
      baseBackground: {
        backgroundColor: variables.stylekitBackgroundColor,
      },
      contrastBackground: {
        backgroundColor: variables.stylekitContrastBackgroundColor,
      },
      container: {
        flex: 1,
        height: '100%',
      },

      flexContainer: {
        flex: 1,
        flexDirection: 'column',
      },

      centeredContainer: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      },

      flexedItem: {
        flexGrow: 1,
      },

      uiText: {
        color: variables.stylekitForegroundColor,
        fontSize: mainTextFontSize,
      },

      view: {},

      contrastView: {},

      tableSection: {
        marginTop: 10,
        marginBottom: 10,
        backgroundColor: variables.stylekitBackgroundColor,
      },

      sectionedTableCell: {
        borderBottomColor: variables.stylekitBorderColor,
        borderBottomWidth: 1,
        paddingLeft: paddingLeft,
        paddingRight: paddingLeft,
        paddingTop: 13,
        paddingBottom: 12,
        backgroundColor: variables.stylekitBackgroundColor,
      },

      textInputCell: {
        maxHeight: 50,
        paddingTop: 0,
        paddingBottom: 0,
      },

      sectionedTableCellTextInput: {
        fontSize: mainTextFontSize,
        padding: 0,
        color: variables.stylekitForegroundColor,
        height: '100%',
      },

      sectionedTableCellFirst: {
        borderTopColor: variables.stylekitBorderColor,
        borderTopWidth: 1,
      },

      sectionedTableCellLast: {},

      sectionedAccessoryTableCell: {
        paddingTop: 0,
        paddingBottom: 0,
        minHeight: 47,
        backgroundColor: 'transparent',
      },

      sectionedAccessoryTableCellLabel: {
        fontSize: mainTextFontSize,
        color: variables.stylekitForegroundColor,
        minWidth: '80%',
      },

      buttonCell: {
        paddingTop: 0,
        paddingBottom: 0,
        flex: 1,
        justifyContent: 'center',
      },

      buttonCellButton: {
        textAlign: 'center',
        textAlignVertical: 'center',
        color:
          Platform.OS === 'android'
            ? variables.stylekitForegroundColor
            : variables.stylekitInfoColor,
        fontSize: mainTextFontSize,
      },

      buttonCellButtonLeft: {
        textAlign: 'left',
      },

      noteText: {
        flexGrow: 1,
        marginTop: 0,
        paddingTop: 10,
        color: variables.stylekitForegroundColor,
        paddingLeft: paddingLeft,
        paddingRight: paddingLeft,
        paddingBottom: 10,
        backgroundColor: variables.stylekitBackgroundColor,
      },

      noteTextIOS: {
        paddingLeft: paddingLeft - 5,
        paddingRight: paddingLeft - 5,
      },

      noteTextNoPadding: {
        paddingLeft: 0,
        paddingRight: 0,
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
        backgroundColor: variables.stylekitBorderColor,
      },

      actionSheetTitleWrapper: {
        backgroundColor: variables.stylekitBackgroundColor,
        marginBottom: 1,
      },

      actionSheetTitleText: {
        color: variables.stylekitForegroundColor,
        opacity: 0.5,
      },

      actionSheetButtonWrapper: {
        backgroundColor: variables.stylekitBackgroundColor,
        marginTop: 0,
      },

      actionSheetButtonTitle: {
        color: variables.stylekitForegroundColor,
      },

      actionSheetCancelButtonWrapper: {
        marginTop: 0,
      },

      actionSheetCancelButtonTitle: {
        color: variables.stylekitInfoColor,
        fontWeight: 'normal',
      },

      bold: {
        fontWeight: 'bold',
      },
    };
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

  stylesForKey(key: string) {
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

import { StyleSheet, StatusBar, Alert, Platform, Dimensions } from 'react-native';
import IconChanger from 'react-native-alternate-icons';
import { supportsDarkMode } from 'react-native-dark-mode';
import { SFItemParams } from 'standard-file-js';
import Auth from '@Lib/sfjs/authManager';
import Server from '@Lib/sfjs/httpManager';
import KeysManager from '@Lib/keysManager';
import ModelManager from '@Lib/sfjs/modelManager';
import Storage from '@Lib/sfjs/storageManager';
import Sync from '@Lib/sfjs/syncManager';
import ThemePreferences from '@Style/ThemePreferences';
import CSSParser from '@Style/Util/CSSParser';
import {
  statusBarColorForTheme,
  keyboardColorForTheme,
  LIGHT_CONTENT,
  DARK_CONTENT,
  LIGHT_MODE_KEY,
  DARK_MODE_KEY
} from '@Style/utils';
import ThemeDownloader from '@Style/Util/ThemeDownloader';

import redJSON from './Themes/red.json';
import blueJSON from './Themes/blue.json';

export default class StyleKit {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new StyleKit();
    }

    return this.instance;
  }

  constructor() {
    this.themeChangeObservers = [];

    this.buildConstants();

    this.createDefaultThemes();

    // KeysManager.get().registerAccountRelatedStorageKeys(['savedTheme']);

    ModelManager.get().addItemSyncObserver('themes', 'SN|Theme', (allItems, validItems, deletedItems, source) => {
      if(this.activeTheme && this.activeTheme.isSwapIn) {
        const matchingTheme = _.find(this.themes(), { uuid: this.activeTheme.uuid });
        if(matchingTheme) {
          this.setActiveTheme(matchingTheme);
          this.activeTheme.isSwapIn = false;
        }
      }
    });

    // once themes have synced, activate the theme for our current mode
    // this.activateThemeForCurrentMode();

    this.signoutObserver = Auth.get().addEventHandler((event) => {
      if(event == SFAuthManager.DidSignOutEvent) {
        this.activateTheme(this.systemThemes[0]);
      }
    });
  }

  addThemeChangeObserver(observer) {
    this.themeChangeObservers.push(observer);
    return observer;
  }

  removeThemeChangeObserver(observer) {
    _.pull(this.themeChangeObservers, observer);
  }

  notifyObserversOfThemeChange() {
    for(var observer of this.themeChangeObservers) {
      observer();
    }
  }

  setModeTo(mode) {
    this.currentDarkMode = mode;
  }

  assignThemeForMode({ theme, mode }) {
    if(!supportsDarkMode) {
      mode = LIGHT_MODE_KEY;
    }

    ThemePreferences.get().setPrefForMode({ mode: mode, theme: theme });

    /**
     * If we're changing the theme for a specific mode and we're currently on
     * that mode, then set this theme as active
     */
    if(this.currentDarkMode === mode && this.activeTheme.uuid !== theme.uuid) {
      this.setActiveTheme(theme);
    }

    Sync.get().sync();
  }

  /**
   * When downloading an external theme, we can't depend on it having all the
   * variables present. So we will merge them with this template variable list
   * to make sure the end result has all variables the app expects. Return a
   * copy as the result may be modified before use.
   */
  templateVariables() {
    return _.clone(redJSON);
  }

  createDefaultThemes() {
    this.systemThemes = [];
    const options = [
      {
        variables: blueJSON,
        name: "Blue",
        isInitial: true
      },
      {
        variables: redJSON,
        name: "Red",
      }
    ];

    for(var option of options) {
      const variables = option.variables;
      variables.statusBar = Platform.OS == 'android' ? LIGHT_CONTENT : DARK_CONTENT;

      const theme = new SNTheme({
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

  async resolveInitialThemes() {
    const runDefaultTheme = () => {
      this.setActiveTheme(this.systemThemes[0]);

      /*
        TODO: store this as the default as a backup
      */
    }

    await ThemePreferences.get().loadFromStorage();

    let themeData = ThemePreferences.get().getPrefForMode(this.currentDarkMode);
    if(!themeData) {
      return runDefaultTheme();
    }

    try {
      /*
        TODO: if this is a system theme based on uuid, use app's JSON data
        and resave to ensure we are always using latest styling
      */

      const theme = new SNTheme(themeData);
      theme.isSwapIn = true;
      this.setActiveTheme(theme);
    } catch (e) {
      console.error("Error parsing initial theme", e);
      return runDefaultTheme();
    }
  }

  static variable(name) {
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

  static stylesForKey(key) {
    const allStyles = this.styles;
    const styles = [allStyles[key]];
    const platform = Platform.OS == 'android' ? 'Android' : 'IOS';
    const platformStyles = allStyles[key+platform];
    if(platformStyles) {
      styles.push(platformStyles);
    }
    return styles;
  }

  keyboardColorForActiveTheme() {
    return keyboardColorForTheme(this.activeTheme);
  }

  themes() {
    const themes = ModelManager.get().themes.sort((a, b) => {
      if(!a.name || !b.name) { return -1; }
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    });
    return this.systemThemes.concat(themes);
  }

  isThemeActive(theme) {
    if(this.activeTheme) {
      return theme.uuid == this.activeTheme.uuid;
    }
    return theme.isMobileActive();
  }

  setActiveTheme(theme) {
    // merge default variables in case this theme has variables that are missing
    const variables = theme.content.variables;
    theme.content.variables = _.merge(this.templateVariables(), variables);
    theme.setMobileActive(true);

    this.activeTheme = theme;

    this.changeDeviceItems(theme);

    this.reloadStyles();

    this.notifyObserversOfThemeChange();
  }

  /**
   * Changes local device items for newly activated theme
   *
   * This includes:
   *     - Status Bar color
   *     - Local App Icon color
   */
  changeDeviceItems(theme) {
    const isAndroid = Platform.OS === 'android';

    // On Android, a time out is required, especially during app startup
    setTimeout(() => {
      const statusBarColor = statusBarColorForTheme(theme);
      StatusBar.setBarStyle(statusBarColor, true);
      // setBackgroundColor is only for Android
      if(isAndroid) {
        // Android <= v22 does not support changing status bar text color. It will always be white
        // So we have to make sure background color has proper contrast
        if(Platform.Version <= 22) {
          StatusBar.setBackgroundColor("#000000");
        } else {
          StatusBar.setBackgroundColor(theme.content.variables.stylekitContrastBackgroundColor);
        }
      }
    }, isAndroid ? 100 : 0);

    if(theme.content.isSystemTheme && !isAndroid) {
      IconChanger.supportDevice((supported) => {
        if(supported) {
          IconChanger.getIconName((currentName) => {
            if(theme.content.isInitial && currentName != 'default') {
              // Clear the icon to default
              IconChanger.setIconName(null);
            } else {
              let newName = theme.content.name;
              if(newName != currentName) {
                IconChanger.setIconName(newName);
              }
            }
          })
        }
      })
    }
  }

  activateTheme(theme) {
    if(this.activeTheme) {
      this.activeTheme.setMobileActive(false);
    }

    const performActivation = async () => {
      // assign this as the preferential theme for current light/dark mode the user is using
      this.assignThemeForMode({ theme: theme, mode: this.currentDarkMode });
    }

    // Theme may have been downloaded before stylekit changes. So if it doesn't have the info color,
    // it needs to be refreshed
    const hasValidInfoColor = theme.content.variables && theme.content.variables.stylekitInfoColor;
    if(!hasValidInfoColor) {
      ThemeDownloader.get().downloadTheme(theme).then((variables) => {
        if(!variables) {
          Alert.alert("Not Available", "This theme is not available on mobile.");
          return;
        }

        if(variables !== theme.content.variables) {
          theme.content.variables = variables;
          theme.setDirty(true);
        }

        if(theme.getNotAvailOnMobile()) {
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

  activateThemeForCurrentMode() {
    const uuid = ThemePreferences.get().getPrefUuidForMode(this.currentDarkMode);
    const matchingTheme = _.find(this.themes(), { uuid: uuid });

    if(matchingTheme) {
      if(matchingTheme.uuid === this.activeTheme.uuid) {
        // Found a match and it's already active, no need to switch
        return;
      }

      // found a matching theme for user preference, switch to that theme
      this.activateTheme(matchingTheme);
    } else {
      // No matching theme found, set currently active theme as the default for this mode (light/dark)
      this.assignThemeForMode({ theme: this.activeTheme, mode: this.currentDarkMode });
    }
  }

  async downloadThemeAndReload(theme) {
    await ThemeDownloader.get().downloadTheme(theme);
    await Sync.get().sync();
  }

  reloadStyles() {
    const variables = this.activeTheme.content.variables;
    const mainTextFontSize = this.constants.mainTextFontSize;
    const paddingLeft = this.constants.paddingLeft;
    this.styles = {
      baseBackground: {
        backgroundColor: variables.stylekitBackgroundColor
      },
      contrastBackground: {
        backgroundColor: variables.stylekitContrastBackgroundColor
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
        alignItems: 'center'
      },

      flexedItem: {
        flexGrow: 1
      },

      uiText: {
        color: variables.stylekitForegroundColor,
        fontSize: mainTextFontSize,
      },

      view: {

      },

      contrastView: {

      },

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
        backgroundColor: variables.stylekitBackgroundColor,
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
        borderTopWidth: 1,
      },

      sectionedTableCellLast: {

      },

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
        color: Platform.OS == 'android' ? variables.stylekitForegroundColor : variables.stylekitInfoColor,
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
        backgroundColor: variables.stylekitBackgroundColor
      },

      noteTextIOS: {
        paddingLeft: paddingLeft - 5,
        paddingRight: paddingLeft - 5,
      },

      noteTextNoPadding: {
        paddingLeft: 0,
        paddingRight: 0
      },

      actionSheetWrapper: {

      },

      actionSheetOverlay: {
        // This is the dimmed background
        // backgroundColor: variables.stylekitNeutralColor
      },

      actionSheetBody: {
        // This will also set button border bottoms, since margin is used instead of borders
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
        color: variables.stylekitForegroundColor,
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
      },
    }
  }

  buildConstants() {
    this.constants = {
      mainTextFontSize: 16,
      paddingLeft: 14
    }
  }

  static platformIconPrefix() {
    return Platform.OS == 'android' ? 'md' : 'ios';
  }

  static nameForIcon(iconName) {
    return StyleKit.platformIconPrefix() + "-" + iconName;
  }
}

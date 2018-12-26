import { StyleSheet, StatusBar, Alert, Platform, Dimensions } from 'react-native';
import App from "./app"
import ModelManager from "./lib/sfjs/modelManager"
import Server from "./lib/sfjs/httpManager"
import Sync from './lib/sfjs/syncManager'
import Storage from "./lib/sfjs/storageManager"
import Auth from "./lib/sfjs/authManager"
import KeysManager from './lib/keysManager'

export default class GlobalStyles {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new GlobalStyles();
    }

    return this.instance;
  }

  async resolveInitialTheme() {
    // Get the active theme from storage rather than waiting for local database to load
    var themeResult = await Storage.get().getItem("activeTheme");
    let runDefaultTheme = () => {
      try {
        var theme = this.systemTheme();
        theme.setMobileActive(true);
        this.activeTheme = theme;
        var constants = this.defaultConstants();
        this.setStyles(this.defaultRules(constants), constants, theme.getMobileRules().statusBar);
      } catch (e) {
        var constants = this.defaultConstants();
        this.setStyles(this.defaultRules(constants), constants, Platform.OS == "android" ? "light-content" : "dark-content");
        console.log("Default theme error", e);
      }
    }

    if(themeResult) {
      // JSON stringified content is generic and includes all items property at time of stringification
      // So we parse it, then set content to itself, so that the mapping can be handled correctly.
      try {
        var parsedTheme = JSON.parse(themeResult);
        var needsMigration = false;
        if(parsedTheme.mobileRules) {
          // Newer versions of the app persist a Theme object where mobileRules are nested in AppData.
          // We want to check if the currently saved data is of the old format, which uses theme.mobileRules
          // instead of theme.getMobileRules(). If so, we want to prepare it for the new format.
          needsMigration = true;
        }
        let content = Object.assign({}, parsedTheme);
        parsedTheme.content = content;

        var theme = new SNTheme(parsedTheme);
        if(needsMigration) {
          theme.setMobileRules(parsedTheme.mobileRules);
          theme.mobileRules = null;
        }

        theme.isSwapIn = true;
        var constants = _.merge(this.defaultConstants(), theme.getMobileRules().constants);
        var rules = _.merge(this.defaultRules(constants), theme.getMobileRules().rules);
        this.setStyles(rules, constants, theme.getMobileRules().statusBar);

        this.activeTheme = theme;
      } catch (e) {
        console.error("Error parsing initial theme", e);
        runDefaultTheme();
      }
    } else {
      runDefaultTheme();
    }
  }

  constructor() {
    KeysManager.get().registerAccountRelatedStorageKeys(["activeTheme"]);

    ModelManager.get().addItemSyncObserver("themes", "SN|Theme", function(allItems, validItems, deletedItems, source){
      if(this.activeTheme && this.activeTheme.isSwapIn) {
        var matchingTheme = _.find(this.themes(), {uuid: this.activeTheme.uuid});
        if(matchingTheme) {
          this.activeTheme = matchingTheme;
          this.activeTheme.isSwapIn = false;
          this.activeTheme.setMobileActive(true);
        }
      }
    }.bind(this));
  }

  static styles() {
    return this.get().styles.rules;
  }

  static constants() {
    return this.get().styles.constants;
  }

  static stylesForKey(key) {
    var rules = this.get().styles.rules;
    var styles = [rules[key]];
    var platform = Platform.OS == "android" ? "Android" : "IOS";
    var platformRules = rules[key+platform];
    if(platformRules) {
      styles.push(platformRules);
    }
    return styles;
  }

  static constantForKey(key) {
    var defaultValue = this.get().constants[key];

    try {
      // For the platform value, if the active theme does not have a specific value, but the defaults do, we don't
      // want to use the defaults, but instead just look at the activeTheme. Because default platform values only apply
      // to the default theme
      var platform = Platform.OS == "android" ? "Android" : "IOS";
      var platformValue = this.get().activeTheme.getMobileRules().constants[key+platform];

      if(platformValue) {
        return platformValue;
      } else {
        return defaultValue;
      }
    } catch (e) {
      return defaultValue;
    }
  }

  systemTheme() {
    if(this._systemTheme) {
      return this._systemTheme;
    }

    var constants = this.defaultConstants();

    this._systemTheme = new SNTheme({
      uuid: 0,
      content: {
        isDefault: true,
        name: "Default",
      }
    });

    this._systemTheme.setMobileRules({
      name: "Default",
      rules: this.defaultRules(constants),
      constants: constants,
      statusBar: Platform.OS == "android" ? "light-content" : "dark-content"
    })

    return this._systemTheme;
  }

  themes() {
    return [this.systemTheme()].concat(ModelManager.get().themes);
  }

  isThemeActive(theme) {
    if(this.activeTheme) {
      return theme.uuid == this.activeTheme.uuid;
    }
    return theme.isMobileActive();
  }

  activateTheme(theme, writeToStorage = true) {
    if(this.activeTheme) {
      this.activeTheme.setMobileActive(false);
    }

    var run = () => {
      var constants = _.merge(this.defaultConstants(), theme.getMobileRules().constants);
      var rules = _.merge(this.defaultRules(constants), theme.getMobileRules().rules);
      this.setStyles(rules, constants, theme.getMobileRules().statusBar);

      this.activeTheme = theme;
      theme.setMobileActive(true);

      if(theme.content.isDefault) {
        Storage.get().removeItem("activeTheme");
      } else if(writeToStorage) {
        Storage.get().setItem("activeTheme", JSON.stringify(theme));
      }

      App.get().reload();
    }

    if(!theme.hasMobileRules()) {
      this.downloadTheme(theme, function(){
        if(theme.getNotAvailOnMobile()) {
          Alert.alert("Not Available", "This theme is not available on mobile.");
        } else {
          Sync.get().sync();
          run();
        }
      });
    } else {
      run();
    }
  }

  async downloadTheme(theme, callback) {
    let errorBlock = (error) => {
      if(!theme.getNotAvailOnMobile()) {
        theme.setNotAvailOnMobile(true);
        theme.setDirty(true);
      }

      callback && callback();

      console.error("Theme download error", error);
    }

    var url = theme.hosted_url || theme.url;

    if(!url) {
      errorBlock(null);
      return;
    }

    if(url.includes("?")) {
      url = url.replace("?", ".json?");
    } else if(url.includes(".css?")) {
      url = url.replace(".css?", ".json?");
    } else {
      url = url + ".json";
    }

    if(App.isAndroid && url.includes("localhost")) {
      url = url.replace("localhost", "10.0.2.2");
    }

    return Server.get().getAbsolute(url, {}, function(response){
      // success
      if(response !== theme.getMobileRules()) {
        theme.setMobileRules(response);
        theme.setDirty(true);
      }

      if(theme.getNotAvailOnMobile()) {
        theme.setNotAvailOnMobile(false);
        theme.setDirty(true);
      }

      if(callback) {
        callback();
      }
    }, function(response) {
      errorBlock(response);
    })
  }

  downloadThemeAndReload(theme) {
    this.downloadTheme(theme, function(){
      Sync.get().sync(function(){
        this.activateTheme(theme);
      }.bind(this));
    }.bind(this))
  }

  setStyles(rules, constants, statusBar) {
    if(!statusBar) { statusBar = "light-content";}
    this.statusBar = statusBar;
    this.constants = constants;
    this.styles = {
      rules: StyleSheet.create(rules),
      constants: constants
    }

    // On Android, a time out is required, especially during app startup
    setTimeout(function () {
      StatusBar.setBarStyle(statusBar, true);
    }, Platform.OS == "android" ? 100 : 0);
  }

  static isIPhoneX() {
    // See https://mydevice.io/devices/ for device dimensions
    const X_WIDTH = 375;
    const X_HEIGHT = 812;
    const { height: D_HEIGHT, width: D_WIDTH } = Dimensions.get('window');
    return Platform.OS === 'ios' &&
      ((D_HEIGHT === X_HEIGHT && D_WIDTH === X_WIDTH) ||
        (D_HEIGHT === X_WIDTH && D_WIDTH === X_HEIGHT));
  }

  defaultConstants() {
    var tintColor = "#fb0206";
    return {
        composeBorderColor: "#F5F5F5",
        mainBackgroundColor: "#ffffff",
        mainTintColor: tintColor,
        mainDimColor: "#9d9d9d",
        mainTextColor: "#000000",
        mainTextFontSize: 16,
        mainHeaderFontSize: 16,

        navBarColor: "white",
        navBarTextColor: tintColor,

        navBarColorAndroid: tintColor,
        navBarTextColorAndroid: "#000000",

        paddingLeft: 14,
        plainCellBorderColor: "#efefef",
        sectionedCellHorizontalPadding: 14,
        selectedBackgroundColor: "#efefef",

        maxSettingsCellHeight: 45
      }
  }

  defaultRules(constants) {
    return {
      container: {
        backgroundColor: constants.mainBackgroundColor,
        height: "100%",
      },

      flexContainer: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: constants.mainBackgroundColor,
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
        color: constants.mainTextColor,
        fontSize: constants.mainTextFontSize,
      },

      view: {
        backgroundColor: constants.mainBackgroundColor,
      },

      tableSection: {
        marginTop: 10,
        marginBottom: 10,
        backgroundColor: constants.mainBackgroundColor
      },

      sectionHeaderContainer: {
        flex: 1,
        flexGrow: 0,
        justifyContent: "space-between",
        flexDirection: 'row',
        paddingRight: constants.paddingLeft,
        paddingBottom: 10,
        paddingTop: 10,
      },

      sectionHeader: {
        fontSize: constants.mainTextFontSize - 4,
        paddingLeft: constants.paddingLeft,
        color: constants.mainDimColor,
        fontWeight: Platform.OS == "android" ? "bold" : "normal"
      },

      sectionHeaderButton: {
        color: constants.mainTintColor
      },

      sectionHeaderAndroid: {
        fontSize: constants.mainTextFontSize - 2,
        color: constants.mainTintColor
      },

      sectionedTableCell: {
        borderBottomColor: constants.plainCellBorderColor,
        borderBottomWidth: 1,
        paddingLeft: constants.paddingLeft,
        paddingRight: constants.paddingLeft,
        paddingTop: 13,
        paddingBottom: 12,
        backgroundColor: constants.mainBackgroundColor,
        flex: 1,
      },

      textInputCell: {
        maxHeight: 50,
        paddingTop: 0,
        paddingBottom: 0
      },

      sectionedTableCellTextInput: {
        fontSize: constants.mainTextFontSize,
        padding: 0,
        color: constants.mainTextColor,
        height: "100%"
      },

      sectionedTableCellFirst: {
        borderTopColor: constants.plainCellBorderColor,
        borderTopWidth: 1,
      },

      sectionedTableCellLast: {

      },

      sectionedTableCellFirstAndroid: {
        borderTopWidth: 0,
      },

      sectionedTableCellLastAndroid: {
        borderBottomWidth: 0,
        borderTopWidth: 0,
      },

      sectionedAccessoryTableCell: {
        paddingTop: 0,
        paddingBottom: 0,
        minHeight: 47,
      },

      sectionedAccessoryTableCellLabel: {
        fontSize: constants.mainTextFontSize,
        color: constants.mainTextColor,
        minWidth: "80%"
      },

      buttonCell: {
        paddingTop: 0,
        paddingBottom: 0,
        flex: 1,
        justifyContent: 'center'
      },

      buttonCellButton: {
        textAlign: "center",
        textAlignVertical: "center",
        color: Platform.OS == "android" ? constants.mainTextColor : constants.mainTintColor,
        fontSize: constants.mainTextFontSize,
      },

      buttonCellButtonLeft: {
        textAlign: "left",
      },

      noteText: {
        flexGrow: 1,
        marginTop: 0,
        paddingTop: 10,
        color: constants.mainTextColor,
        paddingLeft: constants.paddingLeft,
        paddingRight: constants.paddingLeft,
        paddingBottom: 10,
        backgroundColor: constants.mainBackgroundColor
      },

      noteTextIOS: {
        paddingLeft: constants.paddingLeft - 5,
        paddingRight: constants.paddingLeft - 5,
      },

      noteTextNoPadding: {
        paddingLeft: 0,
        paddingRight: 0
      },

      syncBar: {
        position: "absolute",
        bottom: 0,
        width: "100%",
        backgroundColor: constants.mainTextColor,
        padding: 5
      },

      syncBarText: {
        textAlign: "center",
        color: constants.mainBackgroundColor
      },

      actionSheetWrapper: {

      },

      actionSheetOverlay: {
        // This is the dimmed background
        // backgroundColor: constants.mainDimColor
      },

      actionSheetBody: {
        // This will also set button border bottoms, since margin is used instead of borders
        backgroundColor: constants.plainCellBorderColor
      },

      actionSheetTitleWrapper: {
        backgroundColor: constants.mainBackgroundColor,
        marginBottom: 1
      },

      actionSheetTitleText: {
        color: constants.mainTextColor,
        opacity: 0.5
      },

      actionSheetButtonWrapper: {
        backgroundColor: constants.mainBackgroundColor,
        marginTop: 0
      },

      actionSheetButtonTitle: {
        color: constants.mainTextColor,
      },

      actionSheetCancelButtonWrapper: {
        marginTop: 0
      },

      actionSheetCancelButtonTitle: {
        color: constants.mainTintColor,
        fontWeight: "normal"
      },

      bold: {
        fontWeight: "bold"
      },
    }
  }

  static actionSheetStyles() {
    return {
      wrapperStyle: GlobalStyles.styles().actionSheetWrapper,
      overlayStyle: GlobalStyles.styles().actionSheetOverlay,
      bodyStyle : GlobalStyles.styles().actionSheetBody,

      buttonWrapperStyle: GlobalStyles.styles().actionSheetButtonWrapper,
      buttonTitleStyle: GlobalStyles.styles().actionSheetButtonTitle,

      titleWrapperStyle: GlobalStyles.styles().actionSheetTitleWrapper,
      titleTextStyle: GlobalStyles.styles().actionSheetTitleText,
      tintColor: App.isIOS ? undefined : GlobalStyles.constants().mainTintColor,

      buttonUnderlayColor: GlobalStyles.constants().plainCellBorderColor,

      cancelButtonWrapperStyle: GlobalStyles.styles().actionSheetCancelButtonWrapper,
      cancelButtonTitleStyle: GlobalStyles.styles().actionSheetCancelButtonTitle,
      cancelMargin: StyleSheet.hairlineWidth
    }
  }

  static shadeBlend(p,c0,c1) {
    var n=p<0?p*-1:p,u=Math.round,w=parseInt;
    if(c0.length>7){
      var f=c0.split(","),t=(c1?c1:p<0?"rgb(0,0,0)":"rgb(255,255,255)").split(","),R=w(f[0].slice(4)),G=w(f[1]),B=w(f[2]);
      return "rgb("+(u((w(t[0].slice(4))-R)*n)+R)+","+(u((w(t[1])-G)*n)+G)+","+(u((w(t[2])-B)*n)+B)+")"
    } else{
      var f=w(c0.slice(1),16),t=w((c1?c1:p<0?"#000000":"#FFFFFF").slice(1),16),R1=f>>16,G1=f>>8&0x00FF,B1=f&0x0000FF;
      return "#"+(0x1000000+(u(((t>>16)-R1)*n)+R1)*0x10000+(u(((t>>8&0x00FF)-G1)*n)+G1)*0x100+(u(((t&0x0000FF)-B1)*n)+B1)).toString(16).slice(1)
    }
  }

  static darken(color, value = -0.15) {
    return this.shadeBlend(value, color);
  }

  static lighten(color, value = 0.25) {
    return this.shadeBlend(value, color);
  }

  static hexToRGBA(hex, alpha) {
    if(!hex) {
      return null;
    }
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c= hex.substring(1).split('');
      if(c.length== 3){
          c= [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c= '0x'+c.join('');
      return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+',' + alpha + ')';
    } else {
      throw new Error('Bad Hex');
    }
  }

}

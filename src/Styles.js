var _ = require('lodash')

import { StyleSheet, StatusBar, Alert, Platform } from 'react-native';
import App from "./app"
import ModelManager from "./lib/modelManager"
import Server from "./lib/server"
import Sync from "./lib/sync"
import Storage from "./lib/storage"
import Auth from "./lib/auth"
import Theme from "./models/app/theme"
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
    return Storage.getItem("activeTheme").then(function(theme) {
      if(theme) {
        theme = JSON.parse(theme);
        theme.isSwapIn = true;
        var constants = _.merge(this.defaultConstants(), theme.mobileRules.constants);
        var rules = _.merge(this.defaultRules(constants), theme.mobileRules.rules);
        this.setStyles(rules, constants, theme.mobileRules.statusBar);

        this.activeTheme = theme;
      } else {
        var theme = this.systemTheme();
        theme.active = true;
        this.activeTheme = theme;
        var constants = this.defaultConstants();
        this.setStyles(this.defaultRules(constants), constants, theme.mobileRules.statusBar);
      }
    }.bind(this));
  }

  constructor() {
    KeysManager.get().registerAccountRelatedStorageKeys(["activeTheme"]);

    ModelManager.getInstance().addItemSyncObserver("themes", "SN|Theme", function(items){
      if(this.activeTheme && this.activeTheme.isSwapIn) {
        this.activeTheme.isSwapIn = false;
        this.activeTheme = _.find(this.themes(), {uuid: this.activeTheme.uuid});
        this.activeTheme.active = true;
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
    var value = this.get().constants[key];

    // For the platform value, if the active theme does not have a specific value, but the defaults do, we don't
    // want to use the defaults, but instead just look at the activeTheme. Because default platform values only apply
    // to the default theme
    var platform = Platform.OS == "android" ? "Android" : "IOS";
    var platformValue = this.get().activeTheme.mobileRules.constants[key+platform];

    if(platformValue) {
      return platformValue;
    } else {
      return value;
    }
  }

  systemTheme() {
    if(this._systemTheme) {
      return this._systemTheme;
    }
    var constants = this.defaultConstants();
    this._systemTheme = new Theme({
      name: "Default",
      default: true,
      uuid: 0,
      mobileRules: {
        name: "Default",
        rules: this.defaultRules(constants),
        constants: constants,
        statusBar: Platform.OS == "android" ? "light-content" : "dark-content"
      }
    });
    return this._systemTheme;
  }

  themes() {
    return [this.systemTheme()].concat(ModelManager.getInstance().themes);
  }

  isThemeActive(theme) {
    return this.activateThemeId === theme.uuid;
  }

  activateTheme(theme, writeToStorage = true) {
    if(this.activeTheme) {
      this.activeTheme.active = false;
    }

    var run = () => {
      var constants = _.merge(this.defaultConstants(), theme.mobileRules.constants);
      var rules = _.merge(this.defaultRules(constants), theme.mobileRules.rules);
      this.setStyles(rules, constants, theme.mobileRules.statusBar);

      this.activeTheme = theme;
      theme.active = true;

      if(theme.default) {
        Storage.removeItem("activeTheme");
      } else if(writeToStorage) {
        Storage.setItem("activeTheme", JSON.stringify(theme));
      }

      App.get().reload();
    }

    if(!theme.mobileRules) {
      this.downloadTheme(theme, function(){
        if(theme.notAvailableOnMobile) {
          Alert.alert("Not Available", "This theme is not available on mobile.");
        } else {
          run();
        }
      });
    } else {
      run();
    }
  }

  async downloadTheme(theme, callback) {
    var url;
    if(theme.url.contains("?")) {
      url = theme.url.replace("?", ".json?");
    } else {
      url = theme.url + ".json";
    }

    if(App.isAndroid && url.contains("localhost")) {
      url = url.replace("localhost", "10.0.2.2");
    }

    return Server.getInstance().getAbsolute(url, {}, function(response){
      // success
      if(response !== theme.mobileRules) {
        theme.mobileRules = response;
        theme.setDirty(true);
      }

      if(theme.notAvailableOnMobile) {
        theme.notAvailableOnMobile = false;
        theme.setDirty(true);
      }

      if(callback) {
        callback();
      }
    }, function(response) {
      // error
      if(!theme.notAvailableOnMobile) {
        theme.notAvailableOnMobile = true;
        theme.setDirty(true);
      }
      if(callback) {
        callback();
      }

      console.log("Theme download error", response);
    })
  }

  downloadThemeAndReload(theme) {
    this.downloadTheme(theme, function(){
      Sync.getInstance().sync(function(){
        this.activateTheme(theme);
      }.bind(this));
    }.bind(this))
  }

  setStyles(rules, constants, statusBar) {
    if(!statusBar) {
      statusBar = "light-content";
    }
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

  defaultConstants() {
    return {
        composeBorderColor: "#F5F5F5",
        mainBackgroundColor: "#ffffff",
        mainTintColor: "#fb0206",
        mainDimColor: "#9d9d9d",
        mainTextColor: "#000000",
        mainTextFontSize: 16,
        mainHeaderFontSize: 16,

        navBarColor: "#ffffff",
        navBarTextColor: "#fb0206",

        navBarColorAndroid: "#fb0206",
        navBarTextColorAndroid: "#ffffff",

        paddingLeft: 14,
        plainCellBorderColor: "#efefef",
        sectionedCellHorizontalPadding: 14,
        selectedBackgroundColor: "#efefef",
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

      sectionHeader: {
        fontSize: constants.mainTextFontSize - 4,
        paddingLeft: constants.paddingLeft,
        paddingBottom: 10,
        paddingTop: 10,
        fontWeight: Platform.OS == "android" ? "bold" : "normal"
      },

      sectionHeaderAndroid: {
        fontSize: constants.mainTextFontSize - 2,
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
        maxHeight: 50
      },

      sectionedTableCellTextInput: {
        fontSize: constants.mainTextFontSize,
        padding: 0,
        color: constants.mainTextColor,
      },

      sectionedTableCellFirst: {
        borderTopColor: constants.plainCellBorderColor,
        borderTopWidth: 1,
      },

      sectionedAccessoryTableCell: {
        paddingLeft: constants.paddingLeft,
        paddingRight: constants.paddingLeft,
      },

      sectionedAccessoryTableCellAndroid: {

      },

      sectionedAccessoryTableCellLabel: {
        fontSize: constants.mainTextFontSize,
        color: constants.mainTextColor,
        // paddingTop: 12,
      },

      buttonCell: {
        paddingTop: 0,
        paddingBottom: 0,
        backgroundColor: constants.mainBackgroundColor,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
      },

      buttonCellButton: {
        textAlign: "center",
        textAlignVertical: "center",
        color: Platform.OS == "android" ? constants.mainTextColor : constants.mainTintColor,
        fontSize: constants.mainTextFontSize,
      },

      buttonCellButtonAndroid: {
        // paddingTop: 11
      },

      buttonCellButtonLeft: {
        textAlign: "left",
        paddingLeft: constants.paddingLeft
      },

      noteText: {
        flexGrow: 1,
        fontSize: 17,
        marginTop: 0,
        paddingTop: 10,
        color: constants.mainTextColor,
        paddingLeft: constants.paddingLeft,
        paddingRight: constants.paddingLeft,
        paddingBottom: 10,
        // textAlignVertical: 'top',
        // lineHeight: 22,
      },

      noteTextIOS: {
        paddingLeft: constants.paddingLeft - 5,
        paddingRight: constants.paddingLeft - 5,
      },

      bold: {
        fontWeight: "bold"
      },
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

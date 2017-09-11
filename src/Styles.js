var _ = require('lodash')

import { StyleSheet, StatusBar } from 'react-native';
import App from "./App"
import ModelManager from "./lib/modelManager"
import Server from "./lib/server"
import Sync from "./lib/sync"
import Storage from "./lib/storage"
import Auth from "./lib/auth"
import Theme from "./models/app/theme"

export default class GlobalStyles {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new GlobalStyles();
    }

    return this.instance;
  }

  static styles() {
    return this.get().styles.rules;
  }

  static constants() {
    return this.get().styles.constants;
  }

  systemTheme() {
    if(this._systemTheme) {
      return this_.systemTheme;
    }
    var constants = this.defaultConstants();
    this._systemTheme = new Theme({
      name: "Default",
      default: true,
      mobileRules: {
        name: "Default",
        rules: this.defaultRules(constants),
        constants: constants,
        statusBar: "dark-content"
      }
    });
    return this._systemTheme;
  }

  constructor() {
    this.loadDefaults();
    this._themes = [this.systemTheme()];

    Auth.getInstance().addSignoutObserver(function(){
      this._themes = [this.systemTheme()];
    }.bind(this));

    ModelManager.getInstance().addItemSyncObserver("themes", "SN|Theme", function(items){
      this.downloadThemes(_.filter(items), {deleted: false});
      this._themes = _.uniq(this._themes.concat(items));

      if(!this.activeThemeId) {
        Storage.getItem("active-theme-id").then(function(themeId){
          this.activeThemeId = themeId;
          if(themeId) {
            this.activateTheme(_.find(this._themes, {uuid: themeId}));
          } else {
            this.systemTheme().active = true;
          }
        }.bind(this));
      }

    }.bind(this));
  }



  loadDefaults() {
    var constants = this.defaultConstants();
    this.setStyles(this.defaultRules(constants), constants, "dark-content");
  }

  downloadThemes(themes) {
    var needingDownload = themes.filter(function(theme){
      return theme.mobileRules == null;
    })

    Promise.all(needingDownload.map(function(theme){
      return this.downloadTheme(theme);
    }.bind(this))).then(function(){
      Sync.getInstance().sync();
    })
  }

  themes() {
    return this._themes;
  }

  isThemeActive(theme) {
    return this.activateThemeId === theme.uuid;
  }

  activateTheme(theme) {
    if(this.activeTheme) {
      this.activeTheme.active = false;
    }

    var constants = _.merge(this.defaultConstants(), theme.mobileRules.constants);
    var rules = _.merge(this.defaultRules(constants), theme.mobileRules.rules);
    this.setStyles(rules, constants, theme.mobileRules.statusBar);

    this.activeTheme = theme;
    theme.active = true;
    if(theme.default) {
      Storage.removeItem("active-theme-id");
    } else {
      Storage.setItem("active-theme-id", theme.uuid);
    }

    App.get().reload();
  }

  async downloadTheme(theme, callback) {
    var url = theme.url.replace("?", ".json?");
    return Server.getInstance().getAbsolute(url, {}, function(response){
      // success
      theme.mobileRules = response;
      theme.setDirty(true);
      if(callback) {
        callback();
      }
    }, function(response){
      if(response.error) {
        theme.mobileRules = response;
        theme.setDirty(true);
      }
      if(callback) {
        callback();
      }
      console.log("Theme download error");
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
    this.constants = constants;
    this.styles = {
      rules: StyleSheet.create(rules),
      constants: constants
    }

    StatusBar.setBarStyle(statusBar, true);
  }

  defaultConstants() {
    return {
        themeColor: "#086DD6",
        mainBackgroundColor: "white",
        mainTintColor: "#fb0206",
        plainCellBorderColor: "#efefef",
        sectionedCellHorizontalPadding: 14,
        mainTextColor: "black",
        selectedBackgroundColor: "#efefef",
        paddingLeft: 14,
        composeBorderColor: "#F5F5F5"
      }
  }

  defaultRules(constants) {
    return {
      container: {
        backgroundColor: constants.mainBackgroundColor,
        height: "100%",
      },

      view: {
        backgroundColor: constants.mainBackgroundColor,
      },

      tableSection: {
        marginTop: 10,
        marginBottom: 10,
        backgroundColor: constants.mainBackgroundColor,
      },

      sectionHeader: {
        color: "gray",
        fontSize: 12,
        paddingLeft: constants.paddingLeft,
        paddingBottom: 10,
        paddingTop: 10
      },

      sectionedTableCell: {
        borderBottomColor: constants.plainCellBorderColor,
        borderBottomWidth: 1,
        paddingLeft: constants.paddingLeft,
        paddingTop: 13,
        backgroundColor: constants.mainBackgroundColor,
        height: 45
      },

      sectionedTableCellTextInput: {
        fontSize: 16,
        height: "100%"
      },

      sectionedTableCellFirst: {
        borderTopColor: constants.plainCellBorderColor,
        borderTopWidth: 1,
      },

      sectionedAccessoryTableCell: {
        paddingLeft: constants.paddingLeft,
        paddingRight: constants.paddingLeft,
        backgroundColor: constants.mainBackgroundColor
      },

      sectionedAccessoryTableCellLabel: {
        paddingTop: 12,
        fontSize: 16,
        color: constants.mainTextColor
      },

      textInputCell: {
        paddingTop: 0
      },

      buttonCell: {
        paddingLeft: 0,
        paddingTop: 0,
        backgroundColor: constants.mainBackgroundColor,
      },

      buttonCellButton: {
        textAlign: "center",
        color: constants.mainTintColor,
        fontSize: 15,
        height: "100%",
        paddingTop: 13
      },

      buttonCellButtonLeft: {
        textAlign: "left",
        paddingLeft: constants.paddingLeft
      },

      bold: {
        fontWeight: "bold"
      },
    }
  }

}

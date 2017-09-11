var _ = require('lodash')

import { StyleSheet, StatusBar } from 'react-native';
import App from "./App"

export default class Styles {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new Styles();
    }

    return this.instance;
  }

  static styles() {
    return this.get().styles.rules;
  }

  static constants() {
    return this.get().styles.constants;
  }

  constructor() {
    this.loadDefaults();
  }

  loadDefaults() {
    var constants = this.defaultConstants();
    this.setStyles(this.defaultRules(constants), constants, "dark-content");
  }

  setStyles(rules, constants, statusBar) {
    this.constants = constants;
    this.styles = {
      rules: StyleSheet.create(rules),
      constants: constants
    }

    StatusBar.setBarStyle(statusBar, true);
  }

  changeTheme() {
    var theme = {
      constants: {
        mainTintColor: "#a366c3",
        mainBackgroundColor: "#0f0f0f",
        mainTextColor: "white",
        plainCellBorderColor: "#1b1b1b",
        selectedBackgroundColor: "#a366c3",
        composeBorderColor: "#1b1b1b"
      },

      rules: {

      },

      statusBar: "light-content"
    }

    var constants = _.merge(this.defaultConstants(), theme.constants);
    var rules = _.merge(this.defaultRules(constants), theme.rules);
    this.setStyles(rules, constants, theme.statusBar);

    console.log("New styles", this.styles);
    App.get().reload();
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

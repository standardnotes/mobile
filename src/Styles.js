import { StyleSheet } from 'react-native';

let mainTintColor = "#fb0206";
let PaddingLeft = 14;

const constants = {
  themeColor: "#086DD6",
  mainBackgroundColor: "white",
  mainTintColor: mainTintColor,
  plainCellBorderColor: "#efefef",
  sectionedCellHorizontalPadding: PaddingLeft,
  textColor: "black",
}

const styles = {
  rules: StyleSheet.create({

    container: {
      backgroundColor: "white",
      height: "100%",
      // flex: 1,
      // flexDirection: "column"
    },

    tableSection: {
      marginTop: 10,
      marginBottom: 10,
    },

    sectionHeader: {
      color: "gray",
      fontSize: 12,
      paddingLeft: PaddingLeft,
      paddingBottom: 10,
      paddingTop: 10
    },

    sectionedTableCell: {
      borderBottomColor: "#ebebf0",
      borderBottomWidth: 1,
      paddingLeft: PaddingLeft,
      paddingTop: 13,
      backgroundColor: "white",
      height: 45
    },

    sectionedTableCellTextInput: {
      fontSize: 16,
      height: "100%"
    },

    sectionedTableCellFirst: {
      borderTopColor: "#ebebf0",
      borderTopWidth: 1,
    },

    sectionedAccessoryTableCell: {
      paddingLeft: PaddingLeft,
      paddingRight: PaddingLeft,
    },

    sectionedAccessoryTableCellLabel: {
      paddingTop: 12,
      fontSize: 16,
      color: constants.textColor
    },

    textInputCell: {
      paddingTop: 0
    },

    buttonCell: {
      paddingLeft: 0,
      paddingTop: 0
    },

    buttonCellButton: {
      textAlign: "center",
      color: mainTintColor,
      fontSize: 15,
      height: "100%",
      paddingTop: 13
    },

    buttonCellButtonLeft: {
      textAlign: "left",
      paddingLeft: PaddingLeft
    },

    bold: {
      fontWeight: "bold"
    },


  }),

  constants: constants
}

export default styles;

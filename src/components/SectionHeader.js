import React, { Component } from 'react';
import {Text, Platform, View, TouchableOpacity} from 'react-native';

import StyleKit from "../style/StyleKit"
import ThemedComponent from "@Components/ThemedComponent"

export default class SectionHeader extends ThemedComponent {
  render() {
    var title = this.props.title;
    if(Platform.OS == "ios") { title = title.toUpperCase(); }
    return (
      <View style={[this.styles.sectionHeaderContainer, {backgroundColor: this.props.backgroundColor, color: this.props.foregroundColor}]}>
        <Text style={this.styles.sectionHeader}>{title}</Text>
        {this.props.buttonText &&
          <TouchableOpacity onPress={this.props.buttonAction}>
            <Text style={this.styles.sectionHeaderButton}>{this.props.buttonText}</Text>
          </TouchableOpacity>
        }
      </View>
    )
  }

  loadStyles() {
    this.styles = {
      sectionHeaderContainer: {
        flex: 1,
        flexGrow: 0,
        justifyContent: "space-between",
        flexDirection: 'row',
        paddingRight: StyleKit.constants.paddingLeft,
        paddingBottom: 10,
        paddingTop: 10,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor
      },

      sectionHeader: {
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
        fontSize: StyleKit.constants.mainTextFontSize - 4,
        paddingLeft: StyleKit.constants.paddingLeft,
        color: StyleKit.variables.stylekitNeutralColor,
        fontWeight: Platform.OS == "android" ? "bold" : "normal"
      },

      sectionHeaderButton: {
        color: StyleKit.variables.stylekitInfoColor
      },

      sectionHeaderAndroid: {
        fontSize: StyleKit.constants.mainTextFontSize - 2,
        color: StyleKit.variables.stylekitInfoColor
      },
    }
  }
}

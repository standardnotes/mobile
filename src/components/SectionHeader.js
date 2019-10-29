import React, { Component } from 'react';
import {Text, Platform, View, TouchableOpacity} from 'react-native';

import StyleKit from "@Style/StyleKit"
import ThemedComponent from "@Components/ThemedComponent"

export default class SectionHeader extends ThemedComponent {
  render() {
    var title = this.props.title;
    if(Platform.OS == "ios") { title = title.toUpperCase(); }
    return (
      <View style={[this.styles.container, {backgroundColor: this.props.backgroundColor, color: this.props.foregroundColor}]}>
        <View>
          <Text style={[this.styles.title, this.props.tinted ? {color: StyleKit.variables.stylekitInfoColor} : null]}>{title}</Text>
          {this.props.subtitle &&
            <Text style={this.styles.subtitle}>{this.props.subtitle}</Text>
          }
        </View>
        {this.props.buttonText &&
          <TouchableOpacity style={this.styles.buttonContainer} onPress={this.props.buttonAction}>
            <Text style={[this.styles.button, this.props.buttonStyles]}>{this.props.buttonText}</Text>
          </TouchableOpacity>
        }
      </View>
    )
  }

  loadStyles() {
    this.styles = {
      container: {
        flex: 1,
        flexGrow: 0,
        justifyContent: "space-between",
        flexDirection: 'row',
        paddingRight: StyleKit.constants.paddingLeft,
        paddingBottom: 10,
        paddingTop: 10,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor
      },

      title: {
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
        fontSize: StyleKit.constants.mainTextFontSize - 4,
        paddingLeft: StyleKit.constants.paddingLeft,
        color: StyleKit.variables.stylekitNeutralColor,
        fontWeight: Platform.OS == "android" ? "bold" : "normal"
      },

      subtitle: {
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
        fontSize: StyleKit.constants.mainTextFontSize - 5,
        marginTop: 4,
        paddingLeft: StyleKit.constants.paddingLeft,
        color: StyleKit.variables.stylekitNeutralColor,
      },

      buttonContainer: {
        flex: 1,
        alignItems: "flex-end",
        justifyContent: "center",
      },

      button: {
        color: StyleKit.variables.stylekitInfoColor
      },

      titleAndroid: {
        fontSize: StyleKit.constants.mainTextFontSize - 2,
        color: StyleKit.variables.stylekitInfoColor
      },
    }
  }
}

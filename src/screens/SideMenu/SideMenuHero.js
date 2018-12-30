import React, { Component } from 'react';
import { ScrollView, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import Icons from '@Style/Icons';
import StyleKit from "@Style/StyleKit"
import ThemedComponent from "@Components/ThemedComponent";


export default class SideMenuHero extends ThemedComponent {

  render() {
    return (
      <View style={this.styles.cell}>
        <Text style={this.styles.title}>{"me@bitar.io"}</Text>
        <Text style={this.styles.subtitle}>{"79/79 notes and tags encrypted"}</Text>
      </View>
    )
  }

  loadStyles() {
    this.styles = {
      cell: {
        flex: 1,
        flexDirection: "column",
        backgroundColor: StyleKit.variables.stylekitContrastBackgroundColor
      },

      title: {
        fontWeight: "bold",
        fontSize: 16,
        color: StyleKit.variables.stylekitContrastForegroundColor,
        marginBottom: 3,
      },

      subtitle: {
        fontSize: 13,
        color: StyleKit.variables.stylekitContrastForegroundColor,
        opacity: 0.6
      }
    }
  }
}

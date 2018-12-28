import React, { Component } from 'react';
import { ScrollView, View, Text, TouchableHighlight } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import Icons from '@Style/Icons';
import StyleKit from "@Style/StyleKit"

export default class SideMenuCell extends Component {

  constructor(props) {
    super(props);
    this.loadStyles();
  }

  onPress = () => {
    this.props.onSelect();
  }

  onLongPress = () => {
    this.props.onLongPress();
  }

  getIconElement() {
    let desc = this.props.iconDesc;
    if(!desc) {
      return null;
    }

    if(desc.type == "icon") {
      return (
        <Icon name={desc.name} size={14} color={this.styles.iconColor} />
      )
    } else if(desc.type == "ascii") {
        return (
          <Text style={this.styles.iconAscii}>{desc.value}</Text>
        )
    } else {
      return (
        <Text>*</Text>
      )
    }
  }

  render() {
    return (
      <TouchableHighlight
        style={this.styles.cell}
        underlayColor={StyleKit.variable("stylekitBorderColor")}
        onPress={this.onPress}
        onLongPress={this.onLongPress}
      >
        <View style={this.styles.cellContent}>
          <View style={this.styles.iconContainer}>
            {this.getIconElement()}
          </View>

          <Text style={this.styles.text}>{this.props.text}</Text>

          {this.props.children}
        </View>
      </TouchableHighlight>
    )
  }

  loadStyles() {
    this.styles = {
      iconColor: StyleKit.variable("stylekitContrastInfoColor"),

      cell: {
        minHeight: 42 ,
      },

      cellContent: {
        flex: 1,
        flexDirection: 'row',
      },

      iconContainer: {
        marginRight: 6
      },

      text: {
        color: StyleKit.variable("stylekitContrastForegroundColor"),
        fontWeight: 'bold',
        fontSize: 15
      },

      iconAscii: {
        fontSize: 15,
        fontWeight: "bold",
        color: StyleKit.variable("stylekitNeutralColor"),
        opacity: 0.6,
      }
    }
  }
}

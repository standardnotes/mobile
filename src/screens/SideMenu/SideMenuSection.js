import React, { Component } from 'react';
import { ScrollView, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import Icons from '@Style/Icons';
import StyleKit from "@Style/StyleKit"

export default class SideMenuSection extends Component {

  constructor(props) {
    super(props);
    this.loadStyles();
  }


  render() {
    return (
      <View>
        <View style={this.styles.header}>
          <Text style={this.styles.title}>{this.props.title}</Text>
        </View>
        {this.props.children}
      </View>
    )
  }

  loadStyles() {
    this.styles = {
      header: {
        height: 30
      },
      title: {
        color: StyleKit.variables.stylekitInfoColor,
        fontSize: 13,
        fontWeight: "700"
      }
    }
  }
}

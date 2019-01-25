import React, { Component } from 'react';
import {TouchableHighlight, Text, View} from 'react-native';
import SectionedTableCell from './SectionedTableCell'
import StyleKit from "@Style/StyleKit"

export default class Circle extends SectionedTableCell {

  constructor(props) {
    super(props);
    this.size = props.size || 12;
    this.loadStyles();
  }

  render() {
    return (
      <View style={this.styles.circle} />
    )
  }

  loadStyles() {
    this.styles = {
      circle: {
        width: this.size,
        height: this.size,
        borderRadius: this.size/2.0,
        backgroundColor: this.props.backgroundColor,
        borderColor: this.props.borderColor,
        borderWidth: 1
      }
    }
  }
}

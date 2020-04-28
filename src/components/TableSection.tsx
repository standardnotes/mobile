import React, { Component } from 'react';
import { View } from 'react-native';
import StyleKit from '@Style/StyleKit';

export default class TableSection extends Component {
  rules() {
    let rules = [StyleKit.styles.tableSection];
    if (this.props.extraStyles) {
      rules = rules.concat(this.props.extraStyles);
    }
    return rules;
  }

  render() {
    return <View style={this.rules()}>{this.props.children}</View>;
  }
}

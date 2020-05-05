import React, { Component } from 'react';
import { View, ViewStyle } from 'react-native';
import StyleKit from '@Style/StyleKit';

type Props = {
  extraStyles?: ViewStyle | ViewStyle[];
};

export default class TableSection extends Component<Props> {
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

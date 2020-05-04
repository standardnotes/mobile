import React, { Component } from 'react';
import { View } from 'react-native';

import StyleKit from '@Style/StyleKit';

export type Props = {
  first?: boolean;
  last?: boolean;
  textInputCell?: any;
  height?: number;
  extraStyles?: any;
  testID?: string;
};

export default class SectionedTableCell<AdditionalProps = {}> extends Component<
  Props & AdditionalProps
> {
  rules() {
    let rules = [StyleKit.styles.sectionedTableCell];
    if (this.props.first) {
      rules.concat(StyleKit.stylesForKey('sectionedTableCellFirst'));
    }
    if (this.props.last) {
      rules.concat(StyleKit.stylesForKey('sectionedTableCellLast'));
    }
    if (this.props.textInputCell) {
      rules.push(StyleKit.styles.textInputCell);
    }
    if (this.props.height) {
      rules.push({ height: this.props.height });
    }
    if (this.props.extraStyles) {
      rules = rules.concat(this.props.extraStyles);
    }
    return rules;
  }

  render() {
    return <View style={this.rules()}>{this.props.children}</View>;
  }
}

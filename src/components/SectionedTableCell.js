import React, { Component } from 'react';
import {View} from 'react-native';

import StyleKit from "@Style/StyleKit"

export default class SectionedTableCell extends Component {

  rules() {
    var rules = [StyleKit.styles.sectionedTableCell];
    if(this.props.first) { rules.push(StyleKit.stylesForKey("sectionedTableCellFirst")); }
    if(this.props.last) { rules.push(StyleKit.stylesForKey("sectionedTableCellLast")); }
    if(this.props.textInputCell) {rules.push(StyleKit.styles.textInputCell); }
    if(this.props.height) {rules.push({height: this.props.height})};
    if(this.props.extraStyles) {
      rules = rules.concat(this.props.extraStyles);
    }
    return rules;
  }

  render() {
    return (
      <View style={this.rules()}>
        {this.props.children}
      </View>
    )
  }
}

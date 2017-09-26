import React, { Component } from 'react';
import {View} from 'react-native';

import GlobalStyles from "../Styles"

export default class SectionedTableCell extends Component {

  rules() {
    var rules = [GlobalStyles.styles().sectionedTableCell];
    if(this.props.first) { rules.push(GlobalStyles.styles().sectionedTableCellFirst); }
    if(this.props.textInputCell) {rules.push(GlobalStyles.styles().textInputCell); }
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

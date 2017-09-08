import React, { Component } from 'react';
import {View} from 'react-native';

import GlobalStyles from "../Styles"

export default class SectionedTableCell extends Component {

  rules() {
    var rules = [GlobalStyles.rules.sectionedTableCell];
    if(this.props.buttonCell) { rules.push(GlobalStyles.rules.buttonCell); }
    if(this.props.first) { rules.push(GlobalStyles.rules.sectionedTableCellFirst); }
    if(this.props.textInputCell) {rules.push(GlobalStyles.rules.textInputCell); }
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

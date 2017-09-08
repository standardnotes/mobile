import React, { Component } from 'react';
import {TouchableOpacity, Text} from 'react-native';

import GlobalStyles from "../Styles"

export default class ButtonCell extends Component {

  rules() {
    var rules = [GlobalStyles.rules.buttonCellButton];
    if(this.props.leftAligned) { rules.push(GlobalStyles.rules.buttonCellButtonLeft) }
    if(this.props.bold) { rules.push(GlobalStyles.rules.bold) }
    return rules;
  }

  render() {
    return (
        <TouchableOpacity onPress={this.props.onPress}>
          <Text style={this.rules()}>{this.props.title}</Text>
        </TouchableOpacity>
    )
  }
}

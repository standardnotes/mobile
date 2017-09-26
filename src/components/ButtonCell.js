import React, { Component } from 'react';
import {TouchableHighlight, Text} from 'react-native';
import SectionedTableCell from './SectionedTableCell'
import GlobalStyles from "../Styles"

export default class ButtonCell extends SectionedTableCell {

  rules() {
    var rules = super.rules();
    if(this.props.maxHeight) { rules.push({maxHeight: this.props.maxHeight}) }
    return rules;
  }

  buttonRules() {
    var rules = [GlobalStyles.stylesForKey("buttonCellButton")];
    if(this.props.leftAligned) { rules.push(GlobalStyles.styles().buttonCellButtonLeft) }
    if(this.props.bold) { rules.push(GlobalStyles.styles().bold) }
    if(this.props.disabled) { rules.push({color: "gray", opacity: 0.6}) }
    return rules;
  }

  render() {
    return (
        <TouchableHighlight underlayColor={GlobalStyles.constants().plainCellBorderColor} style={[GlobalStyles.styles().flexContainer, GlobalStyles.styles().buttonCell, ...this.rules()]} disabled={this.props.disabled} onPress={this.props.onPress}>
          <Text style={this.buttonRules()}>{this.props.title}</Text>
        </TouchableHighlight>
    )
  }
}

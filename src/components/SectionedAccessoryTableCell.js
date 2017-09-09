import React, { Component } from 'react';
import {View, Image, Text, TouchableHighlight} from 'react-native';

import GlobalStyles from "../Styles"
import SectionedTableCell from "./SectionedTableCell"

import Icon from 'react-native-vector-icons/Ionicons';

export default class SectionedAccessoryTableCell extends SectionedTableCell {

  rules() {
    return super.rules().concat([GlobalStyles.rules.sectionedAccessoryTableCell]);
  }

  iconName() {
    return this.props.selected() ? "ios-checkmark-circle" : "ios-radio-button-off";
  }

  onPress = () => {
    this.props.onPress();
    this.forceUpdate();
  }

  render() {
    return (
      <TouchableHighlight onPress={this.onPress}>
        <View style={this.rules()}>
          <Text style={GlobalStyles.rules.sectionedAccessoryTableCellLabel}>{this.props.text}</Text>
          <View style={{position: "absolute", right: GlobalStyles.constants.sectionedCellHorizontalPadding, top: 6}}>
            <Icon name={this.iconName()} size={30} color={GlobalStyles.constants.mainTintColor} />
          </View>
        </View>
      </TouchableHighlight>
    )
  }
}

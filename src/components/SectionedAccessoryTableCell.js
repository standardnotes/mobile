import React, { Component } from 'react';
import {View, Image, Text, TouchableHighlight} from 'react-native';

import GlobalStyles from "../Styles"
import SectionedTableCell from "./SectionedTableCell"

import Icon from 'react-native-vector-icons/Ionicons';

export default class SectionedAccessoryTableCell extends SectionedTableCell {

  rules() {
    return super.rules().concat([GlobalStyles.styles().view, GlobalStyles.styles().sectionedAccessoryTableCell]);
  }

  onPress = () => {
    this.props.onPress();
    this.forceUpdate();
  }

  onLongPress = () => {
    if(this.props.onLongPress) {
      this.props.onLongPress();
    }
  }

  render() {
    var iconName = (this.props.selected && this.props.selected()) ? "ios-checkmark-circle" : null;
    return (
      <TouchableHighlight style={GlobalStyles.styles().view} onPress={this.onPress} onLongPress={this.onLongPress}>
        <View style={this.rules()}>
          <Text style={GlobalStyles.styles().sectionedAccessoryTableCellLabel}>{this.props.text}</Text>
          {iconName &&
            <View style={{position: "absolute", right: GlobalStyles.constants().sectionedCellHorizontalPadding, top: 6}}>
              <Icon name={iconName} size={30} color={GlobalStyles.constants().mainTintColor} />
            </View>
          }
        </View>
      </TouchableHighlight>
    )
  }
}

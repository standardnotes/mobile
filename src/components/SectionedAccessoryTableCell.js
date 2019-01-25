import React, { Component } from 'react';
import {View, Image, Text, TouchableHighlight, Platform} from 'react-native';

import StyleKit from "@Style/StyleKit"
import SectionedTableCell from "./SectionedTableCell"

import Icon from 'react-native-vector-icons/Ionicons';

export default class SectionedAccessoryTableCell extends SectionedTableCell {

  rules() {
    var rules = super.rules().concat([
      StyleKit.styles.view,
      StyleKit.styles.flexContainer,
      ...StyleKit.stylesForKey("sectionedAccessoryTableCell")
    ]);
    return rules;
  }

  onPress = () => {
    if(this.props.disabled) {
      return;
    }

    this.props.onPress();
    this.forceUpdate();
  }

  onLongPress = () => {
    if(this.props.disabled) {
      return;
    }
    
    if(this.props.onLongPress) {
      this.props.onLongPress();
    }
  }

  render() {
    var checkmarkName = Platform.OS == "android" ? "md-checkbox" : "ios-checkmark-circle";
    var iconName = this.props.iconName ? this.props.iconName : ((this.props.selected && this.props.selected()) ? checkmarkName : null);

    var iconStyles = {
      width: 30,
      maxWidth: 30,
    }

    var left = this.props.leftAlignIcon;
    var iconSize = left ? 25: 30;
    var color = left ? StyleKit.variable("stylekitForegroundColor") : StyleKit.variable("stylekitInfoColor");


    if(Platform.OS == "android") { iconSize -= 5; }

    if(this.props.color) {
      color = this.props.color;
    }

    var icon = (
      <View key={0} style={iconStyles}>
        <Icon name={iconName} size={iconSize} color={color} />
      </View>
    )

    if(!iconName) {
      icon = null;
    }

    var textStyles = [StyleKit.styles.sectionedAccessoryTableCellLabel];

    if(this.props.bold || (this.props.selected && this.props.selected())) {
      textStyles.push(StyleKit.styles.bold)
    }
    if(this.props.tinted) {
      textStyles.push({color: StyleKit.variable("stylekitInfoColor")})
    }
    if(this.props.dimmed) {
      textStyles.push({color: StyleKit.variable("stylekitNeutralColor")})
    }
    if(this.props.color) {
      textStyles.push({color: this.props.color})
    }

    var textWrapper = (<Text key={1} style={textStyles}>{this.props.text}</Text>);

    var containerStyles = {
      flex: 1,
      justifyContent: left ? 'flex-start' : 'space-between',
      flexDirection: 'row',
      alignItems: 'center'
    }

    return (
      <TouchableHighlight underlayColor={StyleKit.variable("stylekitBorderColor")} style={this.rules()} onPress={this.onPress} onLongPress={this.onLongPress}>
        <View style={containerStyles}>
        {
          this.props.leftAlignIcon
          ? [icon, textWrapper]
          : [textWrapper, icon]
        }
        </View>
      </TouchableHighlight>
    )
  }
}

import React from 'react';
import { View, Text, TouchableHighlight, Platform } from 'react-native';
import SectionedTableCell from '@Components/SectionedTableCell';
import StyleKit from '@Style/StyleKit';

import Icon from 'react-native-vector-icons/Ionicons';

export default class SectionedAccessoryTableCell extends SectionedTableCell {
  rules() {
    const rules = super
      .rules()
      .concat([
        StyleKit.styles.view,
        StyleKit.styles.flexContainer,
        ...StyleKit.stylesForKey('sectionedAccessoryTableCell')
      ]);
    return rules;
  }

  onPress = () => {
    if (this.props.disabled) {
      return;
    }

    this.props.onPress();
    this.forceUpdate();
  };

  onLongPress = () => {
    if (this.props.disabled) {
      return;
    }

    if (this.props.onLongPress) {
      this.props.onLongPress();
    }
  };

  render() {
    const checkmarkName =
      Platform.OS === 'android' ? 'md-checkbox' : 'ios-checkmark-circle';
    const iconName = this.props.iconName
      ? this.props.iconName
      : this.props.selected && this.props.selected()
      ? checkmarkName
      : null;

    const iconStyles = {
      width: 30,
      maxWidth: 30
    };

    const left = this.props.leftAlignIcon;
    let iconSize = left ? 25 : 30;
    let color = left
      ? StyleKit.variables.stylekitForegroundColor
      : StyleKit.variables.stylekitInfoColor;

    if (Platform.OS === 'android') {
      iconSize -= 5;
    }

    if (this.props.color) {
      color = this.props.color;
    }

    var icon = (
      <View key={0} style={iconStyles}>
        <Icon name={iconName} size={iconSize} color={color} />
      </View>
    );

    if (!iconName) {
      icon = null;
    }

    var textStyles = [StyleKit.styles.sectionedAccessoryTableCellLabel];

    if (this.props.bold || (this.props.selected && this.props.selected())) {
      textStyles.push(StyleKit.styles.bold);
    }
    if (this.props.tinted) {
      textStyles.push({ color: StyleKit.variables.stylekitInfoColor });
    }
    if (this.props.dimmed) {
      textStyles.push({ color: StyleKit.variables.stylekitNeutralColor });
    }
    if (this.props.color) {
      textStyles.push({ color: this.props.color });
    }

    const textWrapper = (
      <Text testID={`${this.props.testID}-text`} key={1} style={textStyles}>
        {this.props.text}
      </Text>
    );

    const containerStyles = {
      flex: 1,
      justifyContent: left ? 'flex-start' : 'space-between',
      flexDirection: 'row',
      alignItems: 'center'
    };

    return (
      <TouchableHighlight
        testID={this.props.testID}
        underlayColor={StyleKit.variables.stylekitBorderColor}
        style={this.rules()}
        onPress={this.onPress}
        onLongPress={this.onLongPress}
      >
        <View style={containerStyles}>
          {this.props.leftAlignIcon ? [icon, textWrapper] : [textWrapper, icon]}
        </View>
      </TouchableHighlight>
    );
  }
}

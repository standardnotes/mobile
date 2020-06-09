import React from 'react';
import { View, Text, TouchableHighlight, Platform } from 'react-native';
import SectionedTableCell from '@Root/components2/SectionedTableCell';

import Icon from 'react-native-vector-icons/Ionicons';

type Props = {
  disabled?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  iconName?: string;
  selected?: () => void;
  leftAlignIcon?: boolean;
  color?: string;
  bold?: boolean;
  tinted?: boolean;
  dimmed?: boolean;
  text: string;
};

export default class SectionedAccessoryTableCell extends SectionedTableCell<
  Props
> {
  rules() {
    const rules = super
      .rules()
      .concat([
        this.context?.getThemeService().styles.view,
        this.context?.getThemeService().styles.flexContainer,
        ...this.context!.getThemeService().stylesForKey(
          'sectionedAccessoryTableCell'
        ),
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
      maxWidth: 30,
    };

    const left = this.props.leftAlignIcon;
    let iconSize = left ? 25 : 30;
    let color = left
      ? this.context?.getThemeService().variables.stylekitForegroundColor
      : this.context?.getThemeService().variables.stylekitInfoColor;

    if (Platform.OS === 'android') {
      iconSize -= 5;
    }

    if (this.props.color) {
      color = this.props.color;
    }
    let icon = null;

    if (iconName) {
      icon = (
        <View key={0} style={iconStyles}>
          <Icon name={iconName} size={iconSize} color={color} />
        </View>
      );
    }

    var textStyles = [
      this.context?.getThemeService().styles.sectionedAccessoryTableCellLabel,
    ];

    if (this.props.bold || (this.props.selected && this.props.selected())) {
      textStyles.push(this.context?.getThemeService().styles.bold);
    }
    if (this.props.tinted) {
      textStyles.push({
        color: this.context?.getThemeService().variables.stylekitInfoColor,
      });
    }
    if (this.props.dimmed) {
      textStyles.push({
        color: this.context?.getThemeService().variables.stylekitNeutralColor,
      });
    }
    if (this.props.color) {
      textStyles.push({ color: this.props.color });
    }

    const textWrapper = (
      <Text testID={`${this.props.testID}-text`} key={1} style={textStyles}>
        {this.props.text}
      </Text>
    );

    return (
      <TouchableHighlight
        testID={this.props.testID}
        underlayColor={
          this.context?.getThemeService().variables.stylekitBorderColor
        }
        style={this.rules()}
        onPress={this.onPress}
        onLongPress={this.onLongPress}
      >
        <View
          style={{
            flex: 1,
            justifyContent: left ? 'flex-start' : 'space-between',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {this.props.leftAlignIcon ? [icon, textWrapper] : [textWrapper, icon]}
        </View>
      </TouchableHighlight>
    );
  }
}

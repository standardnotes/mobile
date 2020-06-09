import React from 'react';
import { TouchableHighlight, Text, View } from 'react-native';
import SectionedTableCell from '@Root/components2/SectionedTableCell';

type Props = {
  maxHeight?: number;
  leftAligned?: boolean;
  bold?: boolean;
  disabled?: boolean;
  important?: boolean;
  onPress: () => void;
  title?: string;
};

export default class ButtonCell extends SectionedTableCell<Props> {
  rules() {
    const rules = super.rules();
    if (this.props.maxHeight) {
      rules.push({ maxHeight: this.props.maxHeight });
    }
    return rules;
  }

  buttonRules() {
    let rules = this.context!.getThemeService().stylesForKey(
      'buttonCellButton'
    );
    if (this.props.leftAligned) {
      rules.push(this.context!.getThemeService().styles.buttonCellButtonLeft);
    }
    if (this.props.bold) {
      rules.push(this.context!.getThemeService().styles.bold);
    }
    if (this.props.disabled) {
      rules.push({ color: 'gray', opacity: 0.6 });
    }
    if (this.props.important) {
      rules.push({
        color: this.context?.getThemeService().variables.stylekitDangerColor,
      });
    }
    return rules;
  }

  render() {
    return (
      <TouchableHighlight
        testID={this.props.testID}
        underlayColor={
          this.context?.getThemeService().variables.stylekitBorderColor
        }
        style={[
          this.context?.getThemeService().styles.flexContainer,
          this.context?.getThemeService().styles.buttonCell,
          ...this.rules(),
        ]}
        disabled={this.props.disabled}
        onPress={this.props.onPress}
      >
        <View>
          <Text style={this.buttonRules()}>{this.props.title}</Text>
          {this.props.children && this.props.children}
        </View>
      </TouchableHighlight>
    );
  }
}

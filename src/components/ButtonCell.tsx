import React from 'react';
import { TouchableHighlight, Text, View } from 'react-native';
import SectionedTableCell from 'components/SectionedTableCell';
import StyleKit from 'style/StyleKit';

export default class ButtonCell extends SectionedTableCell {
  rules() {
    const rules = super.rules();
    if (this.props.maxHeight) {
      rules.push({ maxHeight: this.props.maxHeight });
    }
    return rules;
  }

  buttonRules() {
    const rules = [StyleKit.stylesForKey('buttonCellButton')];
    if (this.props.leftAligned) {
      rules.push(StyleKit.styles.buttonCellButtonLeft);
    }
    if (this.props.bold) {
      rules.push(StyleKit.styles.bold);
    }
    if (this.props.disabled) {
      rules.push({ color: 'gray', opacity: 0.6 });
    }
    if (this.props.important) {
      rules.push({ color: StyleKit.variables.stylekitDangerColor });
    }
    return rules;
  }

  render() {
    return (
      <TouchableHighlight
        testID={this.props.testID}
        underlayColor={StyleKit.variables.stylekitBorderColor}
        style={[
          StyleKit.styles.flexContainer,
          StyleKit.styles.buttonCell,
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

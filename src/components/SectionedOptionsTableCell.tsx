import React from 'react';
import {
  View,
  Text,
  TouchableHighlight,
  ViewStyle,
  TextStyle,
} from 'react-native';
import ThemedComponent from '@Components/ThemedComponent';
import StyleKit from '@Style/StyleKit';

type Option = { selected: boolean; key: string; title: string };

type Props = {
  title: string;
  first?: boolean;
  height?: number;
  extraStyles?: ViewStyle;
  testID?: string;
  onPress: (option: Option) => void;
  options: Option[];
};

export default class SectionedOptionsTableCell extends ThemedComponent<Props> {
  styles!: Record<string, ViewStyle | TextStyle>;
  rules() {
    let rules = [StyleKit.styles.sectionedTableCell];
    if (this.props.first) {
      rules.push(StyleKit.styles.sectionedTableCellFirst);
    }
    if (this.props.height) {
      rules.push({ height: this.props.height });
    }
    if (this.props.extraStyles) {
      rules = rules.concat(this.props.extraStyles);
    }
    rules.push({
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 0,
      paddingTop: 0,
      paddingBottom: 0,
      paddingRight: 5,
      maxHeight: 45,
    });
    return rules;
  }

  render() {
    return (
      <View testID={this.props.testID} style={this.rules()}>
        <Text
          testID={`${this.props.testID}-title`}
          style={[
            StyleKit.styles.sectionedAccessoryTableCellLabel,
            this.styles.titleStyles,
          ]}
        >
          {this.props.title}
        </Text>
        <View style={this.styles.optionsContainerStyle}>
          {this.props.options.map(option => {
            const buttonStyles = [this.styles.buttonStyles];
            if (option.selected) {
              buttonStyles.push(this.styles.selectedButtonStyles);
            }
            return (
              <TouchableHighlight
                testID={`${this.props.testID}-option-${option.key}`}
                underlayColor={StyleKit.variables.stylekitBorderColor}
                key={option.title}
                style={[
                  StyleKit.styles.view,
                  this.styles.buttonContainerStyles,
                ]}
                onPress={() => {
                  this.props.onPress(option);
                }}
              >
                <Text style={buttonStyles}>{option.title}</Text>
              </TouchableHighlight>
            );
          })}
        </View>
      </View>
    );
  }

  loadStyles() {
    this.styles = {
      titleStyles: {
        width: '42%',
        minWidth: 0,
      },

      optionsContainerStyle: {
        width: '58%',
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
      },

      buttonContainerStyles: {
        borderLeftColor: StyleKit.variables.stylekitBorderColor,
        borderLeftWidth: 1,
        height: '100%',
        flexGrow: 1,
        padding: 10,
        paddingTop: 12,
      },

      buttonStyles: {
        color: StyleKit.variables.stylekitNeutralColor,
        fontSize: 16,
        textAlign: 'center',
        width: '100%',
      },

      selectedButtonStyles: {
        color: StyleKit.variables.stylekitInfoColor,
      },
    };
  }
}

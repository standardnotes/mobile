import React, { Component } from 'react';
import {View, Text, TouchableHighlight} from 'react-native';

import StyleKit from "@Style/StyleKit"

export default class SectionedOptionsTableCell extends Component {

  rules() {
    var rules = [StyleKit.styles.sectionedTableCell];
    if(this.props.first) { rules.push(StyleKit.styles.sectionedTableCellFirst); }
    if(this.props.height) {rules.push({height: this.props.height})};
    if(this.props.extraStyles) {
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
      maxHeight: 45
    })
    return rules;
  }

  constructor(props) {
    super(props);

    this.titleStyles = {
      width: "42%",
      minWidth: 0
    }

    this.optionsContainerStyle = {
      width: "58%",
      flex: 1,
      flexDirection: 'row',
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: StyleKit.variable("stylekitBackgroundColor")
    }

    this.buttonContainerStyles = {
      borderLeftColor: StyleKit.variable("stylekitBorderColor"),
      borderLeftWidth: 1,
      height: "100%",
      flexGrow: 1,
      padding: 10,
      paddingTop: 12
    };

    this.buttonStyles = {
      color: StyleKit.variable("stylekitNeutralColor"),
      fontSize: 16,
      textAlign: "center",
      width: "100%",
    }

    this.selectedButtonStyles = {
      color: StyleKit.variable("stylekitInfoColor"),
    }
  }

  render() {
    return (
      <View style={this.rules()}>
        <Text style={[StyleKit.styles.sectionedAccessoryTableCellLabel, this.titleStyles]}>{this.props.title}</Text>
        <View style={this.optionsContainerStyle}>
          {this.props.options.map((option) => {
            var buttonStyles = [this.buttonStyles];
            if(option.selected) {
              buttonStyles.push(this.selectedButtonStyles);
            }
            return (
              <TouchableHighlight underlayColor={StyleKit.variable("stylekitBorderColor")} key={option.title} style={[StyleKit.styles.view, this.buttonContainerStyles]} onPress={() => {this.props.onPress(option)}}>
                <Text style={buttonStyles}>{option.title}</Text>
              </TouchableHighlight>
            )
          })}
        </View>
      </View>
    )
  }
}

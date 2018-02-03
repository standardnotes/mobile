import React, { Component } from 'react';
import {Text, Platform, View, TouchableOpacity} from 'react-native';

import GlobalStyles from "../Styles"

export default class SectionHeader extends Component {
  render() {
    var title = this.props.title;
    if(Platform.OS == "ios") {
      title = title.toUpperCase();
    }
    return (
      <View style={GlobalStyles.stylesForKey("sectionHeaderContainer")}>
        <Text style={GlobalStyles.stylesForKey("sectionHeader")}>{title}</Text>
        {this.props.buttonText &&
          <TouchableOpacity onPress={this.props.buttonAction}>
            <Text style={GlobalStyles.stylesForKey("sectionHeaderButton")}>{this.props.buttonText}</Text>
          </TouchableOpacity>
        }
      </View>
    )
  }
}

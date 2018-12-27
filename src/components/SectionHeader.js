import React, { Component } from 'react';
import {Text, Platform, View, TouchableOpacity} from 'react-native';

import StyleKit from "../style/StyleKit"

export default class SectionHeader extends Component {
  render() {
    var title = this.props.title;
    if(Platform.OS == "ios") {
      title = title.toUpperCase();
    }
    return (
      <View style={StyleKit.stylesForKey("sectionHeaderContainer")}>
        <Text style={StyleKit.stylesForKey("sectionHeader")}>{title}</Text>
        {this.props.buttonText &&
          <TouchableOpacity onPress={this.props.buttonAction}>
            <Text style={StyleKit.stylesForKey("sectionHeaderButton")}>{this.props.buttonText}</Text>
          </TouchableOpacity>
        }
      </View>
    )
  }
}

import React, { Component } from 'react';
import {Text, Platform} from 'react-native';

import GlobalStyles from "../Styles"

export default class SectionHeader extends Component {
  render() {
    var title = this.props.title;
    if(Platform.OS == "ios") {
      title = title.toUpperCase();
    }
    return (
      <Text style={GlobalStyles.stylesForKey("sectionHeader")}>{title}</Text>
    )
  }
}

import React, { Component } from 'react';
import {Text} from 'react-native';

import GlobalStyles from "../Styles"

export default class SectionHeader extends Component {
  render() {
    return (
      <Text style={GlobalStyles.rules.sectionHeader}>{this.props.title.toUpperCase()}</Text>
    )
  }
}

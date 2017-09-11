import React, { Component } from 'react';
import {View} from 'react-native';

import GlobalStyles from "../Styles"

export default class TableSection extends Component {
  render() {
    return (
      <View style={GlobalStyles.styles().tableSection}>
        {this.props.children}
      </View>
    )
  }
}

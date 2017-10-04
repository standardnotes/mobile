import React, { Component } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import GlobalStyles from "../Styles"
import App from "../app"
import Icon from 'react-native-vector-icons/Ionicons';

export default class LockedView extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    let color = GlobalStyles.constants().mainTintColor;
    return (
      <View style={GlobalStyles.styles().centeredContainer}>
        <Text style={{color: color, marginTop: 5, fontWeight: "bold"}}>Application Locked.</Text>
        <Text style={{color: color, marginTop: 5}}>Return to Notes to unlock.</Text>
      </View>
    )
  }

}

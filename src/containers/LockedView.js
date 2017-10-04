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
        <Icon name={App.isIOS ? 'ios-lock' : 'md-lock'} size={25} color={color} />
        <Text style={{color: color, marginTop: 5}}>Application Locked</Text>
      </View>
    )
  }

}

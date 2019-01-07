import React, { Component } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import StyleKit from "@Style/StyleKit"
import Icon from 'react-native-vector-icons/Ionicons';

export default class LockedView extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    let color = StyleKit.variable("stylekitInfoColor");
    var styles = [StyleKit.styles.centeredContainer, {backgroundColor: StyleKit.variables.stylekitBackgroundColor}];
    if(this.props.style) {
      styles.push(this.props.style);
    }
    return (
      <View style={styles}>
        <Text style={{color: color, marginTop: 5, fontWeight: "bold"}}>Application Locked.</Text>
        <Text style={{color: color, marginTop: 5}}>Return to Notes to unlock.</Text>
      </View>
    )
  }

}

import React, { Component } from 'react';
import { StyleSheet, View, Text, TouchableWithoutFeedback } from 'react-native';
import { withNavigation } from 'react-navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import ThemedPureComponent from '@Components/ThemedPureComponent';
import { SCREEN_SETTINGS } from '@Screens/screens';
import {
  ICON_USER,
  ICON_FORWARD
} from '@Style/icons';
import StyleKit from '@Style/StyleKit';

const NOT_BACKED_UP_TEXT = "Data not backed up";
const SIGN_IN_TEXT = "Sign in or register to backup your notes";

export class OfflineBanner extends ThemedPureComponent {

  _onPress = () => {
    this.props.navigation.navigate(SCREEN_SETTINGS);
  }

  render() {
    return (
      <TouchableWithoutFeedback
        onPress={this._onPress}
      >
        <View style={this.styles.container}>
          <View style={{ justifyContent: 'center' }}>
            <Icon
              style={this.styles.icon}
              name={StyleKit.nameForIcon(ICON_USER)}
            />
          </View>

          <View style={this.styles.textContainer}>
            <Text style={this.styles.boldText}>{NOT_BACKED_UP_TEXT}</Text>
            <Text style={this.styles.subText}>{SIGN_IN_TEXT}</Text>
          </View>

          <View style={{ justifyContent: 'center' }}>
            <Icon
              style={[this.styles.icon, this.styles.forward]}
              name={StyleKit.nameForIcon(ICON_FORWARD)}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    )
  }

  loadStyles() {
    const margin = 4;
    const padding = 12;

    this.styles = StyleSheet.create({
      container: {
        flex: 1,
        flexDirection: 'row',
        margin: margin,
        padding: padding,
        borderWidth: 1,
        borderRadius: 4,
        borderColor: StyleKit.variables.stylekitBorderColor
      },
      icon: {
        fontSize: 24,
        color: StyleKit.variables.stylekitInfoColor
      },
      textContainer: {
        flex: 1,
        paddingLeft: padding,
      },
      boldText: {
        fontSize: 15,
        fontWeight: '600',
        color: StyleKit.variables.stylekitForegroundColor
      },
      subText: {
        marginTop: 2,
        fontSize: 11,
        color: StyleKit.variables.stylekitNeutralColor
      },
      forward: {
        color: StyleKit.variables.stylekitNeutralColor
      }
    });
  }
}

export default withNavigation(OfflineBanner);
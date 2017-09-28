var _ = require('lodash')
import React, { Component } from 'react';
import Abstract from "./Abstract"
import GlobalStyles from "../Styles"
import FingerprintScanner from 'react-native-fingerprint-scanner';
import {Text, View, Button, StyleSheet, Platform} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import App from "../app"

export default class Fingerprint extends Abstract {

  constructor(props) {
    super(props);
    this.state = {};

    this.styles = StyleSheet.create({
      container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      },

      text: {
        fontWeight: "bold",
        color: GlobalStyles.constants().mainTextColor,
        textAlign: 'center',
        width: "100%"
      },

      error: {
        color: "red",
        padding: 10,
        paddingLeft: 25,
        paddingRight: 25,
        textAlign: "center"
      },

      success: {
        color: "green"
      },

      dev: {
        marginTop: 50,
        backgroundColor: GlobalStyles.constants().mainDimColor,
        padding: 15,
        paddingTop: 20,
        borderRadius: 5,
        opacity: 0.5
      },

      centered: {
        textAlign: "center",
        color: GlobalStyles.constants().mainTextColor
      },
    });

  }

  componentDidMount() {
    super.componentDidMount();
    this.authenticate();
  }

  authenticate() {
    if(Platform.OS == "android") {
      FingerprintScanner.authenticate({ onAttempt: this.handleInvalidAttempt }).then(() => {
        this.handleSuccessfulAuth();
      })
      .catch((error) => {
        console.log("Error:", error);
        if(error.name == "UserCancel") {
          this.authenticate();
        } else {
          if(this.isMounted()) {
            this.setState({ error: error.message });
          }
        }
      });
    } else {
      FingerprintScanner.authenticate({fallbackEnabled: false, description: 'Fingerprint is required to access your notes.' })
        .then(() => {
          this.handleSuccessfulAuth();
        })
        .catch((error) => {
          console.log("Error:", error);
          if(this.isMounted()) {
            this.setState({ error: error.message });
          }
        });
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    FingerprintScanner.release();
  }

  handleInvalidAttempt = (error) => {
    this.setState({ error: error.message });
  }

  handleSuccessfulAuth = () => {
    this.mergeState({success: true});
    setTimeout(() => {
      this.props.onAuthenticateSuccess();
      this.dismissModal();
    }, 350);
  }

  render() {
    let iconColor = this.state.success ? "green" : GlobalStyles.constants().mainTextColor;
    let textStyles = [this.styles.text];
    var iconName = App.isAndroid ? "md-finger-print" : 'ios-finger-print';
    var text = "Please scan your fingerprint";

    if(this.state.success) {
      iconName = App.isAndroid ? "md-checkmark-circle-outline" : "ios-checkmark-circle-outline";
      text = "Successfully Authenticated.";
      textStyles.push(this.styles.success);
    }

    return (
      <View style={[GlobalStyles.styles().container, this.styles.container]}>

        <Icon
          style={{marginBottom: 20}}
          name={iconName}
          size={50}
          color={iconColor}
        />
        <Text style={textStyles}>{text}</Text>

        {this.state.error &&
          <Text style={this.styles.error}>{this.state.error}</Text>
        }

        {__DEV__ &&
          <View style={[this.styles.dev]}>
            <Text style={this.styles.centered}>Dev Build Detected</Text>
            <Button
              onPress={this.handleSuccessfulAuth}
              title={"Simulate Successful Fingerprint"}
              color={GlobalStyles.constants().mainTextColor}
            />
          </View>
        }
      </View>
    );
  }
}

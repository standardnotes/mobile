import React, { Component } from 'react';
import Auth from '../lib/auth'
import Crypto from '../lib/crypto'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";
import Abstract from "./Abstract"
import Storage from '../lib/storage'
import KeysManager from '../lib/keysManager'
import GlobalStyles from "../Styles"
import FingerprintScanner from 'react-native-fingerprint-scanner';
var _ = require('lodash')

import {
  Text,
  View,
  Button,
  StyleSheet,
  Platform
} from 'react-native';

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
        color: GlobalStyles.constants().mainTextColor
      },

      error: {
        color: "red",
        padding: 10,
        paddingLeft: 25,
        paddingRight: 25,
        textAlign: "center"
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
    this.authenticate();
  }

  authenticate() {
    if(Platform.OS == "android") {
      FingerprintScanner
      .authenticate({ onAttempt: this.handleInvalidAttempt })
      .then(() => {
        this.handleSuccessfulAuth();
      })
      .catch((error) => {
        console.log("Error:", error);
        if(error.name == "UserCancel") {
          this.authenticate();
        } else {
          this.setState({ error: error.message });
        }
      });
    } else {
      FingerprintScanner
        .authenticate({fallbackEnabled: false, description: 'Fingerprint is required to access your notes.' })
        .then(() => {
          this.handleSuccessfulAuth();
        })
        .catch((error) => {
          console.log("Error:", error);
          this.setState({ error: error.message });
        });
    }
  }

  componentWillUnmount() {
    FingerprintScanner.release();
  }

  handleInvalidAttempt = (error) => {
    this.setState({ error: error.message });
    // try again
    this.authenticate();
  }

  handleSuccessfulAuth = () => {
    this.props.onAuthenticateSuccess();
    this.props.navigator.dismissModal({animationType: "slide-down"})
  }

  render() {
    return (
      <View style={[GlobalStyles.styles().container, this.styles.container]}>
        <Text style={this.styles.text}>Please scan your fingerprint</Text>

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

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
      <View style={[GlobalStyles.styles().container, styles.container]}>
        <Text style={styles.text}>Please scan your fingerprint</Text>

        {this.state.error &&
          <Text style={styles.error}>{this.state.error}</Text>
        }

        {__DEV__ &&
          <View style={[styles.dev]}>
            <Text style={styles.centered}>Dev Build Detected</Text>
            <Button
              onPress={this.handleSuccessfulAuth}
              title="Simulate Successful Fingerprint"
              color="black"
            />
          </View>
        }
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },

  text: {
    fontWeight: "bold",
  },

  error: {
    color: "red",
    padding: 10,
    paddingLeft: 20,
    paddingRight: 20,
    textAlign: "center"
  },

  dev: {
    marginTop: 50,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    padding: 15,
    paddingTop: 20,
    borderRadius: 5,
    opacity: 0.5
  },

  centered: {
    textAlign: "center"
  },

});

import React, { Component } from 'react';
import Auth from '../lib/auth'
import Crypto from '../lib/crypto'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";
import SectionedOptionsTableCell from "../components/SectionedOptionsTableCell";
import Abstract from "./Abstract"
import Storage from '../lib/storage'
import KeysManager from '../lib/keysManager'
import GlobalStyles from "../Styles"
var _ = require('lodash')
import App from "../app"
import FingerprintScanner from 'react-native-fingerprint-scanner';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  TextInput,
  SectionList,
  ScrollView,
  View,
  Text,
  Alert,
  Keyboard,
  InteractionManager,
  StyleSheet,
  Button,
  Dimensions
} from 'react-native';

export default class Authenticate extends Abstract {

  constructor(props) {
    super(props);
    console.log("Constructing Authentication Component");
  }

  dismiss() {
    if(!this.props.pseudoModal) {
      this.dismissModal();
    }
  }

  onNavigatorEvent(event) {
    super.onNavigatorEvent(event);
    if (event.type == 'NavBarButtonPress') { // this is the event type for button presses
      if (event.id == 'cancel') { // this is the same id field from the static navigatorButtons definition
        this.dismiss();
      }
    }
  }

  configureNavBar() {
    if(this.props.mode === "setup") {
      this.props.navigator.setButtons({
        leftButtons: [{
            title: 'Cancel',
            id: 'cancel',
            showAsAction: 'ifRoom',
          }],
        animated: false
      });
    }
  }

  componentDidMount() {
    super.componentDidMount();
    if(this.props.requireFingerprint) {
      this.refs.fingerprintSection.beginAuthentication();
    } else if(this.props.requirePasscode) {
      this.refs.passcodeSection.beginAuthentication();
    }
  }

  onPasscodeSetupSuccess = () => {
    this.props.onSetupSuccess();
    this.dismiss();
  }

  onPasscodeAuthenticateSuccess = () => {
    this.props.onAuthenticateSuccess();
    this.dismiss();
  }

  onFingerprintSuccess = () => {
    if(this.props.requirePasscode) {
      setTimeout(() => {
        this.refs.passcodeSection.beginAuthentication();
      }, 100);
    } else {
      this.props.onAuthenticateSuccess();
      this.dismiss();
    }
  }

  render() {
    var sectionTitle;
    if(this.props.mode == "setup") {
      sectionTitle = "Choose passcode";
    } else if(this.props.requirePasscode && this.props.requireFingerprint) {
      sectionTitle = "Authentication Required";
    } else if(this.props.requirePasscode) {
      sectionTitle = "Enter Passcode";
    } else if(this.props.requireFingerprint) {
      sectionTitle = "Fingerprint Required";
    }

    return (
      <View style={GlobalStyles.styles().flexContainer}>
        <ScrollView keyboardShouldPersistTaps={'always'} keyboardDismissMode={'interactive'}>
          <TableSection>

            <SectionHeader title={sectionTitle} />

            {this.props.requireFingerprint &&
              <FingerprintSection first={true} ref={'fingerprintSection'} onAuthenticateSuccess={this.onFingerprintSuccess} />
            }

            {(this.props.requirePasscode || this.props.mode === "setup") &&
              <PasscodeSection ref={'passcodeSection'} first={!this.props.requireFingerprint} mode={this.props.mode} onSetupSuccess={this.onPasscodeSetupSuccess} onAuthenticateSuccess={this.onPasscodeAuthenticateSuccess} />
            }


          </TableSection>
        </ScrollView>
      </View>
    );
  }
}

const SAVE_BUTTON_DEFAULT_TEXT = "Save";
const UNLOCK_BUTTON_DEFAULT_TEXT = "Unlock";

class PasscodeSection extends Abstract {

    constructor(props) {
      super(props);
      this.state = {
        passcode: null,
        setupButtonText: SAVE_BUTTON_DEFAULT_TEXT,
        unlockButtonText: UNLOCK_BUTTON_DEFAULT_TEXT,
        setupButtonEnabled: true,
        unlockButtonEnabled: true,
      };

      Storage.getItem("passcodeKeyboardType").then((result) => {
        this.keyboardType = result || 'default';
        if(this.keyboardType !== "default") {
          this.renderOnMount(() => {
            if(this.authenticationBegan) {
              this.refreshKeyboard();
            }
          });
        }
      })
    }

    defaultPasswordParams() {
      return {
        pw_cost: __DEV__ ? 3000 : 100000,
        version: "002"
      };
    }

    beginAuthentication() {
      this.authenticationBegan = true;
      this.refs.input.focus();
    }

    async onSavePress() {
      var passcode = this.state.passcode;
      if(passcode.length == 0) {
        Alert.alert('Invalid Passcode', "Please enter a valid passcode and try again.", [{text: 'OK'}])
        return;
      }

      this.mergeState({setupButtonText: "Generating Keys...", setupButtonEnabled: false})

      // Allow UI to update before executing block task. InteractionManager.runAfterInteractions doesn't seem to work.
      setTimeout(async () => {
        var salt = await Crypto.generateRandomKey(256);
        var params = _.merge(this.defaultPasswordParams(), {pw_salt: salt});

        Crypto.generateKeys(passcode, params, function(keys){
          // make sure it has valid items
          if(_.keys(keys).length > 0) {
            KeysManager.get().persistOfflineKeys(keys);
            KeysManager.get().setOfflineAuthParams(params);

            this.props.onSetupSuccess();
          } else {
            this.mergeState({setupButtonText: SAVE_BUTTON_DEFAULT_TEXT, setupButtonEnabled: true});
            Alert.alert("Passcode Error", "There was an error setting up your passcode. Please try again.");
          }
        }.bind(this));
      }, 125);

    }

    async onUnlockPress() {
      var invalid = () => {
        this.mergeState({unlockButtonText: UNLOCK_BUTTON_DEFAULT_TEXT, unlockButtonEnabled: true});
        Alert.alert('Invalid Passcode', "Please enter a valid passcode and try again.", [{text: 'OK'}])
      }

      var passcode = this.state.passcode;
      if(!passcode) {
        invalid();
        return;
      }

      this.mergeState({unlockButtonText: "Generating Keys...", unlockButtonEnabled: false})

      // Allow UI to update before executing block task. InteractionManager.runAfterInteractions doesn't seem to work.
      setTimeout(() => {
         var params = KeysManager.get().offlineAuthParams;
         Crypto.generateKeys(passcode, params, function(keys){
           if(keys.pw === KeysManager.get().offlinePasscodeHash()) {
             KeysManager.get().setOfflineKeys(keys);
             this.props.onAuthenticateSuccess();
           } else {
             invalid();
           }
         }.bind(this));
      }, 125);
    }

    onKeyboardOptionsSelect = (option) => {
      if(option.key !== this.keyboardType) {
        this.keyboardType = option.key;
        Storage.setItem("passcodeKeyboardType", option.key);
        this.forceUpdate();
        this.refreshKeyboard();
      }
    }

    refreshKeyboard() {
      if(App.isIOS) {
        // on Android, keyboard will update right away
        Keyboard.dismiss();
        setTimeout(() => {
          this.refs.input.focus();
        }, 100);
      }
    }

    render() {
      let keyboardOptions = [
        {title: "General", key: "default", selected: this.keyboardType == "default"},
        {title: "Numeric", key: "numeric", selected: this.keyboardType == "numeric"}
      ]

      let optionsComponents = (
        <SectionedOptionsTableCell title={"Keyboard Type"} options={keyboardOptions} onPress={this.onKeyboardOptionsSelect}/>
      )

      return (
        <View>
          <SectionedTableCell textInputCell={true} first={this.props.first}>
            <TextInput
              ref={'input'}
              style={GlobalStyles.styles().sectionedTableCellTextInput}
              placeholder={"Local passcode"}
              onChangeText={(text) => this.setState({passcode: text})}
              value={this.state.passcode}
              autoCorrect={false}
              autoFocus={this.props.mode == "setup"}
              autoCapitalize={'none'}
              secureTextEntry={true}
              keyboardType={this.keyboardType}
              underlineColorAndroid={'transparent'}
              placeholderTextColor={GlobalStyles.constants().mainDimColor}
            />
          </SectionedTableCell>

          {this.props.mode == "authenticate" &&
            <ButtonCell maxHeight={45} title={this.state.unlockButtonText} disabled={!this.state.unlockButtonEnabled} bold={true} onPress={() => this.onUnlockPress()} />
          }

          {this.props.mode == "setup" &&
            <View>
              {optionsComponents}
              <ButtonCell maxHeight={45} title={this.state.setupButtonText} disabled={!this.state.setupButtonEnabled} bold={true} onPress={() => this.onSavePress()} />
            </View>
          }
        </View>
      );
    }
}

class FingerprintSection extends Abstract {

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
  }

  beginAuthentication() {
    if(App.isAndroid) {
      FingerprintScanner.authenticate({ onAttempt: this.handleInvalidAttempt }).then(() => {
        this.handleSuccessfulAuth();
      })
      .catch((error) => {
        console.log("Error:", error);
        if(error.name == "UserCancel") {
          this.beginAuthentication();
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
    var success = () => {
      this.props.onAuthenticateSuccess();
    }

    this.mergeState({success: true});
    setTimeout(success, 50);
  }

  __dev_simulateSuccess = () => {
    this.handleSuccessfulAuth();
  }

  render() {
    let iconColor = this.state.success ? "green" : GlobalStyles.constants().mainTextColor;
    let textStyles = [this.styles.text];
    var iconName = App.isAndroid ? "md-finger-print" : 'ios-finger-print';
    var text = this.state.error ? this.state.error : "Please scan your fingerprint";

    if(this.state.success) {
      iconName = App.isAndroid ? "md-checkmark-circle-outline" : "ios-checkmark-circle-outline";
      text = "Fingerprint Successful";
      textStyles.push(this.styles.success);
    }

    return (
      <View>
        <SectionedAccessoryTableCell
          first={this.props.first}
          iconName={iconName}
          onPress={() => {__DEV__ && this.__dev_simulateSuccess()}}
          text={text}
          color={ this.state.success ? GlobalStyles.constants().mainTintColor : null}
          leftAlignIcon={true}
        />
      </View>
    );
  }
}

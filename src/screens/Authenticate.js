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
import ApplicationState from "../ApplicationState";

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
} from 'react-native';

export default class Authenticate extends Abstract {

  constructor(props) {
    super(props);

    this.authProps = App.get().getAuthenticationProps();

    this.observer = ApplicationState.get().addStateObserver((state) => {
      if(state == 'foreground') {
        if(this.isMounted()) {
          console.log("Beginning Auth From State Observer for State", state);
          this.beginAuthentication();
        } else {
          this.authenticateOnMount = true;
        }
      }
    })
  }

  componentWillUnmount() {
    ApplicationState.get().removeStateObserver(this.observer);
    super.componentWillUnmount();
  }

  componentDidMount() {
    super.componentDidMount();

    let nextAppState = ApplicationState.get().nextAppState;
    let isLaunching = ApplicationState.get().isLaunching();
    let goingToBackground = ["background", "inactive"].includes(nextAppState);

    if((!goingToBackground && isLaunching) || this.authenticateOnMount) {
      console.log("Beginning Auth From Component Did Mount", nextAppState, "auth on mount", this.authenticateOnMount);
      this.beginAuthentication();
      this.authenticateOnMount = false;
    }
  }

  beginAuthentication = () => {
    if(ApplicationState.get().isAuthenticationInProgress()) {
      return;
    }

    ApplicationState.get().setAuthenticationInProgress(true);

    this.mergeState({began: true});

    // Allow render to call so that this.refs is defined
    setTimeout(() => {
      if(this.authProps.fingerprint) {
        this.beginFingerprintAuth();
      } else if(this.authProps.passcode) {
        this.beginPasscodeAuth();
      }
    }, 0);
  }

  beginFingerprintAuth() {
    this.refs.fingerprintSection.beginAuthentication();
  }

  beginPasscodeAuth() {
    this.refs.passcodeSection.beginAuthentication();
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

  onPasscodeSetupSuccess = () => {
    this.props.onSetupSuccess();
    this.dismiss();
  }

  onPasscodeAuthenticateSuccess = () => {
    this.mergeState({passcodeSuccess: true});

    if(this.authProps.fingerprint && !this.state.fingerprintSuccess) {
      this.beginFingerprintAuth();
    } else {
      this.props.onAuthenticateSuccess();
      ApplicationState.get().setAuthenticationInProgress(false);
      this.dismiss();
    }

  }

  onFingerprintSuccess = () => {
    this.mergeState({fingerprintSuccess: true});

    if(this.authProps.passcode && !this.state.passcodeSuccess) {
      setTimeout(() => {
        this.beginPasscodeAuth();
      }, 100);
    } else {
      this.props.onAuthenticateSuccess();
      ApplicationState.get().setAuthenticationInProgress(false);
      this.dismiss();
    }
  }

  render() {

    var sectionTitle;
    if(this.props.mode == "setup") {
      sectionTitle = "Choose passcode";
    } else if(this.authProps.passcode && this.authProps.fingerprint) {
      sectionTitle = "Authentication Required";
    } else if(this.authProps.passcode) {
      sectionTitle = "Enter Passcode";
    } else if(this.authProps.fingerprint) {
      sectionTitle = "Fingerprint Required";
    } else {
      // sectionTitle = "Missing";
    }

    return (
      <View style={GlobalStyles.styles().flexContainer}>
        <ScrollView style={{paddingTop: this.props.mode == 'authenticate' ? 15 : 0}} keyboardShouldPersistTaps={'always'} keyboardDismissMode={'interactive'}>
          <TableSection>

            <SectionHeader title={sectionTitle} />

            {this.authProps.fingerprint &&
              <FingerprintSection began={this.state.began} first={true} ref={'fingerprintSection'} onPress={this.beginAuthentication} onAuthenticateSuccess={this.onFingerprintSuccess} />
            }

            {(this.authProps.passcode || this.props.mode === "setup") &&
              <PasscodeSection waitingForFingerprint={this.authProps.fingerprint && !this.state.fingerprintSuccess} ref={'passcodeSection'} first={!this.authProps.fingerprint} mode={this.props.mode} onSetupSuccess={this.onPasscodeSetupSuccess} onAuthenticateSuccess={this.onPasscodeAuthenticateSuccess} />
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

      this.mergeState({setupButtonText: "Saving Keys...", setupButtonEnabled: false})

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

      this.mergeState({unlockButtonText: "Verifying Keys...", unlockButtonEnabled: false})

      // Allow UI to update before executing block task. InteractionManager.runAfterInteractions doesn't seem to work.
      setTimeout(() => {
         var params = KeysManager.get().offlineAuthParams;
         Crypto.generateKeys(passcode, params, function(keys){
           if(keys.pw === KeysManager.get().offlinePasscodeHash()) {
             KeysManager.get().setOfflineKeys(keys);
             this.props.onAuthenticateSuccess();
             if(this.props.waitingForFingerprint) {
               this.mergeState({unlockButtonText: "Waiting for Fingerprint", unlockButtonEnabled: false})
             }
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

  onPress = () => {
    if(!this.props.began) {
      this.props.onPress();
    } else {
      __DEV__ && this.__dev_simulateSuccess();
    }
  }

  __dev_simulateSuccess = () => {
    this.handleSuccessfulAuth();
  }

  render() {
    let iconColor = this.state.success ? "green" : GlobalStyles.constants().mainTextColor;
    let textStyles = [this.styles.text];
    var iconName = App.isAndroid ? "md-finger-print" : 'ios-finger-print';
    var text = this.state.error ? this.state.error : "Please scan your fingerprint";

    if(!this.props.began) {
      text = "Tap here to begin authentication.";
    }

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
          onPress={this.onPress}
          text={text}
          color={ this.state.success ? GlobalStyles.constants().mainTintColor : null}
          leftAlignIcon={true}
        />
      </View>
    );
  }
}

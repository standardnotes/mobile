import React, { Component } from 'react';
import App from "../app"
import SF from '../lib/sfjs/sfjs'
import Storage from '../lib/sfjs/storageManager'
import Auth from '../lib/sfjs/authManager'
import KeysManager from '../lib/keysManager'

import Abstract from "./Abstract"
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";
import SectionedOptionsTableCell from "../components/SectionedOptionsTableCell";
import GlobalStyles from "../Styles"
import FingerprintScanner from 'react-native-fingerprint-scanner';
import Icon from 'react-native-vector-icons/Ionicons';
import {Navigation} from 'react-native-navigation';

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
    this.authProps = props.authProps;
    this.state = {biometricsType: "touch", biometricsNoun: "Fingerprint"};
  }

  componentWillUnmount() {
    super.componentWillUnmount();
  }

  componentDidMount() {
    super.componentDidMount();

    KeysManager.getDeviceBiometricsAvailability((available, type, noun) => {
      this.setState({biometricsType: type, biometricsNoun: noun})
    })
  }

  beginAuthentication = () => {
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

  navigationButtonPressed({ buttonId }) {
    if (buttonId == 'cancel') { // this is the same id field from the static navigatorButtons definition
      this.dismiss();
    }
  }

  configureNavBar() {
    if(this.props.mode === "setup") {
       Navigation.mergeOptions(this.props.componentId, {
         topBar: {
           leftButtons: [{
             text: 'Cancel',
             id: 'cancel',
             showAsAction: 'ifRoom',
           }],
         }
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
      sectionTitle = `${this.state.biometricsNoun} Required`;
    } else {
      sectionTitle = "Missing";
    }

    var isAuthenticating = this.props.mode === "authenticate";
    var isSetup = !isAuthenticating;
    var paddingTop = (App.isIOS && GlobalStyles.isIPhoneX()) ? 30 : 15;

    return (
      <View style={GlobalStyles.styles().flexContainer}>
        <ScrollView style={{paddingTop: this.props.mode == 'authenticate' ? paddingTop : 0}} keyboardShouldPersistTaps={'always'} keyboardDismissMode={'interactive'}>
          <TableSection>

            <SectionHeader title={sectionTitle} />

            {isAuthenticating && this.authProps.fingerprint &&
              <FingerprintSection
                first={true}
                last={!this.authProps.passcode}
                ref={'fingerprintSection'}
                biometricsType={this.state.biometricsType}
                biometricsNoun={this.state.biometricsNoun}
                onPress={this.beginAuthentication}
                onAuthenticateSuccess={this.onFingerprintSuccess}
              />
            }

            {((isAuthenticating && this.authProps.passcode) || isSetup) &&
              <PasscodeSection
                waitingForFingerprint={isAuthenticating && this.authProps.fingerprint && !this.state.fingerprintSuccess}
                ref={'passcodeSection'}
                first={(isAuthenticating && !this.authProps.fingerprint) || isSetup}
                mode={this.props.mode} onSetupSuccess={this.onPasscodeSetupSuccess}
                onAuthenticateSuccess={this.onPasscodeAuthenticateSuccess}
              />
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

      Storage.get().getItem("passcodeKeyboardType").then((result) => {
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
        let identifier = await SF.get().crypto.generateUUID();

        SF.get().crypto.generateInitialKeysAndAuthParamsForUser(identifier, passcode).then((results) => {
          let keys = results.keys;
          let authParams = results.authParams;

          // make sure it has valid items
          if(_.keys(keys).length > 0) {
            KeysManager.get().persistOfflineKeys(keys);
            KeysManager.get().setOfflineAuthParams(authParams);

            this.props.onSetupSuccess();
          } else {
            this.mergeState({setupButtonText: SAVE_BUTTON_DEFAULT_TEXT, setupButtonEnabled: true});
            Alert.alert("Passcode Error", "There was an error setting up your passcode. Please try again.");
          }
        });
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

         var authParams = KeysManager.get().offlineAuthParams;
         SF.get().crypto.computeEncryptionKeysForUser(passcode, authParams).then((keys) => {
           if(keys.pw === KeysManager.get().offlinePasscodeHash()) {
             KeysManager.get().setOfflineKeys(keys);
             this.props.onAuthenticateSuccess();
             if(this.props.waitingForFingerprint) {
               this.mergeState({unlockButtonText: "Waiting for Fingerprint", unlockButtonEnabled: false})
             }
           } else {
             invalid();
           }
         });

      }, 125);
    }

    onKeyboardOptionsSelect = (option) => {
      if(option.key !== this.keyboardType) {
        this.keyboardType = option.key;
        Storage.get().setItem("passcodeKeyboardType", option.key);
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
              onSubmitEditing={this.props.mode == 'authenticate' ? this.onUnlockPress.bind(this) : this.onSavePress.bind(this)}
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

    if(this.state.began) {
      return;
    }

    this.mergeState({began: true, error: null});

    console.log("Creating FingerprintScanner Instance");
    if(App.isAndroid) {
      FingerprintScanner.authenticate({ onAttempt: this.handleInvalidAttempt }).then(() => {
        this.handleSuccessfulAuth();
      })
      .catch((error) => {
        console.log("Fingerprint Error:", error);
        // if(error.name == "UserCancel") does not apply to Android
        if(this.isMounted()) {
          this.setState({ error: "Authentication failed. Tap to try again.", began: false});
        }
      });
    } else {
      // iOS
      FingerprintScanner.authenticate({fallbackEnabled: true, description: 'Fingerprint is required to access your notes.' })
        .then(() => {
          this.handleSuccessfulAuth();
        })
        .catch((error) => {
          console.log("Error:", error);
          if(error.name == "UserCancel") {
            this.mergeState({ began: false });
          } else if(this.isMounted()) {
            this.mergeState({ error: "Authentication failed. Tap to try again.", began: false });
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
    if(__DEV__) {
      this.__dev_simulateSuccess();
      return;
    }

    if(!this.state.began) {
      this.props.onPress();
    }
  }

  __dev_simulateSuccess = () => {
    this.handleSuccessfulAuth();
  }

  render() {
    let iconColor = this.state.success ? "green" : GlobalStyles.constants().mainTextColor;
    let textStyles = [this.styles.text];
    var iconName = App.isAndroid ? "md-finger-print" : 'ios-finger-print';

    var text;
    if(this.state.began) {
      if(this.props.biometricsType == "face") {
        text = "Please scan your face";
      } else {
        text = "Please scan your fingerprint";
      }
    } else  {
      text = "Tap here to begin authentication.";
    }

    if(this.state.error) {
      text = this.state.error;
    }

    if(this.state.success) {
      iconName = App.isAndroid ? "md-checkmark-circle-outline" : "ios-checkmark-circle-outline";
      text = `${this.props.biometricsNoun} Successful`;
      textStyles.push(this.styles.success);
    }

    return (
      <View>
        <SectionedAccessoryTableCell
          first={this.props.first}
          last={this.props.last}
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

import React, { Component } from 'react';
import Auth from '../lib/auth'
import Crypto from '../lib/crypto'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";
import SectionedOptionsTableCell from "../components/SectionedOptionsTableCell";
import Abstract from "./Abstract"
import Storage from '../lib/storage'
import KeysManager from '../lib/keysManager'
import GlobalStyles from "../Styles"
var _ = require('lodash')
import App from "../app"

import {
  TextInput,
  SectionList,
  ScrollView,
  View,
  Text,
  Alert,
  Keyboard,
  InteractionManager
} from 'react-native';

const SAVE_BUTTON_DEFAULT_TEXT = "Save";
const UNLOCK_BUTTON_DEFAULT_TEXT = "Unlock";

export default class Authenticate extends Abstract {

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
      console.log("Got keyboard type", result);
      this.keyboardType = result || 'default';
      this.renderOnMount();
    })
  }

  defaultPasswordParams() {
    return {
      pw_cost: __DEV__ ? 3000 : 100000,
      version: "002"
    };
  }

  onNavigatorEvent(event) {
    super.onNavigatorEvent(event);
    if (event.type == 'NavBarButtonPress') { // this is the event type for button presses
      if (event.id == 'cancel') { // this is the same id field from the static navigatorButtons definition
        this.dismissModal();
      }
    }
  }

  configureNavBar() {
    if(this.props.mode === "setup") {
      this.props.navigator.setButtons({
        leftButtons: [
          {
            title: 'Cancel',
            id: 'cancel',
            showAsAction: 'ifRoom',
          }
        ],
        animated: false
      });
    }
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

          this.dismissModal();
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
           this.dismissModal();
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

      if(App.isIOS) {
        // on Android, keyboard will update right away
        Keyboard.dismiss();
        setTimeout(() => {
          this.refs.input.focus();
        }, 100);
      }
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
      <View style={GlobalStyles.styles().container}>
        <TableSection extraStyles={[GlobalStyles.styles().container]}>
          {this.props.mode == "authenticate" &&
            <View style={GlobalStyles.styles().container}>
              <SectionHeader title={"Enter local passcode"} />

              <SectionedTableCell textInputCell={true} first={true}>
                <TextInput
                  ref={'input'}
                  style={GlobalStyles.styles().sectionedTableCellTextInput}
                  placeholder={"Local passcode"}
                  onChangeText={(text) => this.setState({passcode: text})}
                  value={this.state.passcode}
                  autoCorrect={false}
                  autoCapitalize={'none'}
                  autoFocus={true}
                  secureTextEntry={true}
                  keyboardType={this.keyboardType}
                  underlineColorAndroid={'transparent'}
                  placeholderTextColor={GlobalStyles.constants().mainDimColor}
                />
              </SectionedTableCell>

              <ButtonCell maxHeight={45} title={this.state.unlockButtonText} disabled={!this.state.unlockButtonEnabled} bold={true} onPress={() => this.onUnlockPress()} />
            </View>
          }

          {this.props.mode == "setup" &&
            <View style={GlobalStyles.styles().container}>
              <SectionHeader title={"Choose passcode"} />

              <SectionedTableCell textInputCell={true} first={true}>
                <TextInput
                  ref={'input'}
                  style={GlobalStyles.styles().sectionedTableCellTextInput}
                  placeholder={"Local passcode"}
                  onChangeText={(text) => this.setState({passcode: text})}
                  value={this.state.passcode}
                  autoCorrect={false}
                  autoCapitalize={'none'}
                  autoFocus={true}
                  secureTextEntry={true}
                  keyboardType={this.keyboardType}
                  underlineColorAndroid={'transparent'}
                  placeholderTextColor={GlobalStyles.constants().mainDimColor}
                />
              </SectionedTableCell>

              {optionsComponents}

              <ButtonCell maxHeight={45} title={this.state.setupButtonText} disabled={!this.state.setupButtonEnabled} bold={true} onPress={() => this.onSavePress()} />
            </View>
          }

        </TableSection>
      </View>
    );
  }

}

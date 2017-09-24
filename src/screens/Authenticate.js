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
var _ = require('lodash')

import {
  TextInput,
  SectionList,
  ScrollView,
  View,
  Alert,
  Keyboard
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
            // buttonColor: GlobalStyles.constants().mainTintColor,
            // buttonFontSize: 17
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
  }

  render() {
    return (
      <View style={GlobalStyles.styles().container}>
        <TableSection extraStyles={[GlobalStyles.styles().container]}>
          {this.props.mode == "authenticate" &&
            <View style={GlobalStyles.styles().container}>
              <SectionHeader title={"Enter local passcode"} />

              <SectionedTableCell textInputCell={true} first={true}>
                <TextInput
                  style={GlobalStyles.styles().sectionedTableCellTextInput}
                  placeholder={"Local passcode"}
                  onChangeText={(text) => this.setState({passcode: text})}
                  value={this.state.passcode}
                  autoCorrect={false}
                  autoCapitalize={'none'}
                  autoFocus={true}
                  secureTextEntry={true}
                  underlineColorAndroid={'transparent'}
                  placeholderTextColor={GlobalStyles.constants().mainDimColor}
                />
              </SectionedTableCell>

              <SectionedTableCell buttonCell={true}>
                  <ButtonCell title={this.state.unlockButtonText} disabled={!this.state.unlockButtonEnabled} bold={true} onPress={() => this.onUnlockPress()} />
              </SectionedTableCell>
            </View>
          }

          {this.props.mode == "setup" &&
            <View style={GlobalStyles.styles().container}>
              <SectionHeader title={"Choose passcode"} />

              <SectionedTableCell textInputCell={true} first={true}>
                <TextInput
                  style={GlobalStyles.styles().sectionedTableCellTextInput}
                  placeholder={"Local passcode"}
                  onChangeText={(text) => this.setState({passcode: text})}
                  value={this.state.passcode}
                  autoCorrect={false}
                  autoCapitalize={'none'}
                  autoFocus={true}
                  secureTextEntry={true}
                  underlineColorAndroid={'transparent'}
                  placeholderTextColor={GlobalStyles.constants().mainDimColor}
                />
              </SectionedTableCell>

              <SectionedTableCell buttonCell={true}>
                  <ButtonCell title={this.state.setupButtonText} disabled={!this.state.setupButtonEnabled} bold={true} onPress={() => this.onSavePress()} />
              </SectionedTableCell>
            </View>
          }

      </TableSection>
      </View>
    );
  }

}

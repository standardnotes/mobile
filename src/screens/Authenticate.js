import React, { Component } from 'react';
import Auth from '../lib/auth'
import Crypto from '../lib/crypto'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";
import Abstract from "./Abstract"
import Storage from '../lib/storage'
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

let ParamsKey = "pc_params";

export class AuthenticationState {
  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new AuthenticationState();
    }

    return this.instance;
  }

  async load() {
    this._hasPasscode = await Storage.getItem(ParamsKey);
  }

  hasPasscode() {
    return this._hasPasscode;
  }

  isUnlocked() {
    return this._isUnlocked;
  }

  setIsUnlocked(isUnlocked) {
    this._isUnlocked = isUnlocked;
  }

  setHasPasscode(hasPasscode) {
    this._hasPasscode = hasPasscode;
  }

  clearPasscode() {
    if(this.isUnlocked() === false) {
      console.error("Can't remove passcode while locked.");
      return;
    }
    Storage.removeItem(ParamsKey);
    this.setHasPasscode(false);
  }
}

export default class Authenticate extends Abstract {

  constructor(props) {
    super(props);
    this.state = {passcode: null};
  }

  defaultPasswordParams() {
    return {
      cost: 100000,
      length: 512
    };
  }

  onNavigatorEvent(event) {
    super.onNavigatorEvent(event);
    if (event.type == 'NavBarButtonPress') { // this is the event type for button presses
      if (event.id == 'cancel') { // this is the same id field from the static navigatorButtons definition
        this.dismiss();
      }
    }
  }

  dismiss() {
    this.props.navigator.dismissModal({animationType: "slide-down"})
  }

  configureNavBar() {
    if(this.props.mode === "setup") {
      this.props.navigator.setButtons({
        leftButtons: [
          {
            title: 'Cancel',
            id: 'cancel',
            showAsAction: 'ifRoom',
            buttonColor: GlobalStyles.constants.mainTintColor,
            buttonFontSize: 17
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
    var salt = await Crypto.generateRandomKey(256);
    var params = _.merge(this.defaultPasswordParams(), {salt: salt});
    params.hash = await Crypto.pbkdf2(passcode, params.salt, params.cost, params.length);

    await Storage.setItem(ParamsKey, JSON.stringify(params));

    console.log("Saving params", params);

    AuthenticationState.get().setHasPasscode(true);
    AuthenticationState.get().setIsUnlocked(true);

    this.props.onSetupSuccess();

    this.dismiss();
  }

  async onUnlockPress() {
    var invalid = function() {
      Alert.alert('Invalid Passcode', "Please enter a valid passcode and try again.", [{text: 'OK'}])
    }

    var passcode = this.state.passcode;
    if(!passcode) {
      invalid();
      return;
    }

    Storage.getItem(ParamsKey).then(async function(object){
      if(!object) {
        Alert.alert('Invalid Passcode State', "Unable to read passcode parameters from system. Please delete the app and re-install to sign in to your account.", [{text: 'OK'}])
        return;
      }
      var params = JSON.parse(object);
      var savedHash = params.hash;
      var computedHash = await Crypto.pbkdf2(passcode, params.salt, params.cost, params.length);
      console.log("Saved hash:", savedHash, "computed", computedHash);
      if(savedHash === computedHash) {
        AuthenticationState.get().setIsUnlocked(true);
        this.dismiss();
        this.props.onAuthenticateSuccess();
      } else {
        invalid();
      }
    }.bind(this))
  }

  render() {
    return (
      <View style={GlobalStyles.rules.container}>
        <TableSection>
          {this.props.mode == "authenticate" &&
            <View>
              <SectionHeader title={"Enter local passcode"} />

              <SectionedTableCell textInputCell={true} first={true}>
                <TextInput
                  style={GlobalStyles.rules.sectionedTableCellTextInput}
                  placeholder={"Local passcode"}
                  onChangeText={(text) => this.setState({passcode: text})}
                  value={this.state.passcode}
                  autoCorrect={false}
                  autoCapitalize={'none'}
                  autoFocus={true}
                  secureTextEntry={true}
                />
              </SectionedTableCell>

              <SectionedTableCell buttonCell={true}>
                  <ButtonCell title={"Unlock"} bold={true} onPress={() => this.onUnlockPress()} />
              </SectionedTableCell>
            </View>
          }

          {this.props.mode == "setup" &&
            <View>
              <SectionHeader title={"Choose passcode"} />

              <SectionedTableCell textInputCell={true} first={true}>
                <TextInput
                  style={GlobalStyles.rules.sectionedTableCellTextInput}
                  placeholder={"Local passcode"}
                  onChangeText={(text) => this.setState({passcode: text})}
                  value={this.state.passcode}
                  autoCorrect={false}
                  autoCapitalize={'none'}
                  autoFocus={true}
                />
              </SectionedTableCell>

              <SectionedTableCell buttonCell={true}>
                  <ButtonCell title={"Save"} bold={true} onPress={() => this.onSavePress()} />
              </SectionedTableCell>
            </View>
          }

      </TableSection>
      </View>
    );
  }

}

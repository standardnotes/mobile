import React, { Component } from 'react';
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import AlertManager from '../lib/alertManager'
import KeysManager from '../lib/keysManager'
import ModelManager from '../lib/modelManager'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";
import Abstract from "./Abstract"
import Authenticate from "./Authenticate"
import ItemParams from "../models/local/itemParams"

import AuthSection from "../containers/account/AuthSection"
import RegistrationConfirmSection from "../containers/account/RegistrationConfirmSection"
import OptionsSection from "../containers/account/OptionsSection"
import PasscodeSection from "../containers/account/PasscodeSection"
import ThemesSection from "../containers/account/ThemesSection"
import EncryptionSection from "../containers/account/EncryptionSection"
import CompanySection from "../containers/account/CompanySection"

var base64 = require('base-64');
var _ = require('lodash')
import GlobalStyles from "../Styles"
import { NativeModules} from 'react-native';
var Mailer = require('NativeModules').RNMail;
import {TextInput, SectionList, ScrollView, View, Alert, Keyboard, Linking, Platform} from 'react-native';

export default class Account extends Abstract {

  constructor(props) {
    super(props);
    this.state = {
      params: {email: "a@bitar.io", password: "password", server: Auth.getInstance().serverUrl()}
    };

    this.dataLoadObserver = Sync.getInstance().registerInitialDataLoadObserver(function(){
      this.forceUpdate();
    }.bind(this))
  }

  loadSecurityStatus() {
    var hasPasscode = KeysManager.get().hasOfflinePasscode();
    var hasFingerprint = KeysManager.get().hasFingerprint();
    this.mergeState({hasPasscode: hasPasscode, hasFingerprint: hasFingerprint})
  }

  componentDidMount() {
    this.loadSecurityStatus();
  }

  componentWillUnmount() {
    Sync.getInstance().removeDataLoadObserver(this.dataLoadObserver);
  }

  onNavigatorEvent(event) {
    super.onNavigatorEvent(event);

    switch(event.id) {
      case 'willAppear':
       this.loadSecurityStatus();
       this.forceUpdate();
       break;
      }
  }

  validate(email, password) {
    if(!email) {
      Alert.alert('Missing Email', "Please enter a valid email address.", [{text: 'OK'}])
      return false;
    }

    if(!password) {
      Alert.alert('Missing Password', "Please enter your password.", [{text: 'OK'}])
      return false;
    }

    return true;
  }

  onSignInPress = (params, callback) => {
    Keyboard.dismiss();

    var email = params.email;
    var password = params.password;

    if(!this.validate(email, password)) {
      return;
    }

    Auth.getInstance().login(email, password, params.server, function(user, error) {
      if(error) {
        Alert.alert(
          'Oops', error.message, [{text: 'OK'}]
        )
        callback();
        return;
      }

      this.onAuthSuccess();
      callback();
    }.bind(this));
  }

  onRegisterPress = (params) => {
    Keyboard.dismiss();
    var email = params.email;
    var password = params.password;

    if(!this.validate(email, password)) {
      return;
    }

    this.mergeState({params: params, confirmRegistration: true});
  }

  onRegisterConfirmSuccess = () => {
    this.mergeState({registering: true});

    var params = this.state.params;

    Auth.getInstance().register(params.email, params.password, params.server, function(user, error) {
      this.mergeState({registering: false, confirmRegistration: false});

      if(error) {
        Alert.alert(
          'Oops', error.message, [{text: 'OK'}]
        )
        return;
      }

      this.onAuthSuccess();
    }.bind(this));
  }

  onRegisterConfirmCancel = () => {
    this.mergeState({confirmRegistration: false});
  }

  markAllDataDirtyAndSync() {
    Sync.getInstance().markAllItemsDirtyAndSaveOffline();
    Sync.getInstance().sync(function(response){
      this.forceUpdate();
    }.bind(this));
  }

  onAuthSuccess = () => {
    this.markAllDataDirtyAndSync();
    this.props.navigator.switchToTab({
      tabIndex: 0
    });
  }

  onSignOutPress = () => {
    AlertManager.showConfirmationAlert(
      "Sign Out?", "Signing out will remove all data from this device, including notes and tags. Make sure your data is synced before proceeding.", "Sign Out",
      function(){
        Auth.getInstance().signout(() => {
          this.forceUpdate();
        })
      }.bind(this)
    )
  }

  async onExportPress() {
    var version = Auth.getInstance().protocolVersion();
    var keys = KeysManager.get().activeKeys();

    var items = [];

    for(var item of ModelManager.getInstance().allItems) {
      var itemParams = new ItemParams(item, keys, version);
      var params = await itemParams.paramsForExportFile();
      items.push(params);
    }

    var data = {items: items}

    if(keys) {
      var authParams = KeysManager.get().activeAuthParams();
      // auth params are only needed when encrypted with a standard file key
      data["auth_params"] = authParams;
    }

    var jsonString = JSON.stringify(data, null, 2 /* pretty print */);
    var base64String = base64.encode(jsonString);

    Mailer.mail({
      subject: 'Standard Notes Backup',
      recipients: [''],
      body: '',
      isHTML: true,
      attachment: { data: base64String, type: '.json', name: 'backup' }
    }, (error, event) => {
        if(error) {
          Alert.alert('Error', 'Unable to send email.');
        }
    });
  }

  onThemeSelect = (theme) => {
    GlobalStyles.get().activateTheme(theme);
  }

  onThemeLongPress = (theme) => {
    AlertManager.showConfirmationAlert(
      "Redownload Theme", "Themes are cached when downloaded. To retrieve the latest version, press Redownload.", "Redownload",
      function(){
        GlobalStyles.get().downloadThemeAndReload(theme);
      }.bind(this)
    )
  }

  onPasscodeEnable = () => {
    this.props.navigator.showModal({
      screen: 'sn.Authenticate',
      title: 'Setup Passcode',
      animationType: 'slide-up',
      passProps: {
        mode: "setup",
        onSetupSuccess: () => {
          var encryptionSource = KeysManager.get().encryptionSource();
          if(encryptionSource == "offline") {
            this.markAllDataDirtyAndSync();
          }
        }
      }
    });
  }

  onPasscodeDisable = () => {
    var encryptionSource = KeysManager.get().encryptionSource();
    var message;
    if(encryptionSource == "account") {
      message = "Are you sure you want to disable your local passcode? This will not affect your encryption status, as your data is currently being encrypted through your sync account keys.";
    } else if(encryptionSource == "offline") {
      message = "Are you sure you want to disable your local passcode? This will disable encryption on your data.";
    }

    AlertManager.showConfirmationAlert(
      "Disable Passcode", message, "Disable Passcode",
      function(){
        var result = KeysManager.get().clearOfflineKeysAndData();

        if(encryptionSource == "offline") {
          // remove encryption from all items
          this.markAllDataDirtyAndSync();
        }

        this.mergeState({hasPasscode: !result});

        this.forceUpdate();
      }.bind(this)
    )
  }

  onFingerprintEnable = () => {
    KeysManager.get().enableFingerprint();
    this.loadSecurityStatus();
  }

  onFingerprintDisable = () => {
    KeysManager.get().disableFingerprint();
    this.loadSecurityStatus();
  }

  onCompanyAction = (action) => {
    if(action == "feedback") {
      var platformString = Platform.OS == "android" ? "Android" : "iOS";
      Linking.openURL(`mailto:hello@standardnotes.org?subject=${platformString} app feedback`);
    } else if(action == "learn_more") {
      Linking.openURL("https://standardnotes.org");
    } else if(action == "privacy") {
      Linking.openURL("https://standardnotes.org/privacy");
    } else if(action == "twitter") {
      Linking.openURL("https://twitter.com/StandardNotes");
    }
  }

  render() {
    let signedIn = !Auth.getInstance().offline();
    var themes = GlobalStyles.get().themes();

    return (
      <View style={GlobalStyles.styles().container}>
        <ScrollView style={{backgroundColor: GlobalStyles.constants().mainBackgroundColor}} keyboardShouldPersistTaps={'always'} keyboardDismissMode={'interactive'}>

          {!signedIn && !this.state.confirmRegistration &&
            <AuthSection params={this.state.params} confirmRegistration={this.state.confirmRegistration}
            title={"Account"} onSignInPress={this.onSignInPress} onRegisterPress={this.onRegisterPress} />
          }

          {this.state.confirmRegistration &&
            <RegistrationConfirmSection
            title={"Confirm your password"}
            password={this.state.params.password}
            registering={this.state.registering}
            onSuccess={this.onRegisterConfirmSuccess}
            onCancel={this.onRegisterConfirmCancel}
            />
          }

          <OptionsSection signedIn={signedIn} title={"Options"}
          onSignOutPress={this.onSignOutPress} onExportPress={this.onExportPress}
          email={KeysManager.get().getUserEmail()}
          />

          <ThemesSection themes={themes} title={"Themes"} onThemeSelect={this.onThemeSelect} onThemeLongPress={this.onThemeLongPress} />

          <PasscodeSection
            hasPasscode={this.state.hasPasscode}
            hasFingerprint={this.state.hasFingerprint}
            onEnable={this.onPasscodeEnable}
            onDisable={this.onPasscodeDisable}
            onFingerprintEnable={this.onFingerprintEnable}
            onFingerprintDisable={this.onFingerprintDisable}
            title={"Security"}
          />

          <EncryptionSection
            title={"Encryption Status"}
          />

          <CompanySection
            title={"Standard Notes"}
            onAction={this.onCompanyAction}
          />

        </ScrollView>
      </View>
    );
  }
}

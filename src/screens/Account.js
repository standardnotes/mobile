import React, { Component } from 'react';
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import AlertManager from '../lib/alertManager'
import ModelManager from '../lib/modelManager'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";
import Abstract from "./Abstract"
import {Authenticate, AuthenticationState} from "./Authenticate"
import ItemParams from "../models/local/itemParams"

import AuthSection from "../containers/account/AuthSection"
import RegistrationConfirmSection from "../containers/account/RegistrationConfirmSection"
import OptionsSection from "../containers/account/OptionsSection"
import PasscodeSection from "../containers/account/PasscodeSection"
import ThemesSection from "../containers/account/ThemesSection"

var base64 = require('base-64');

var _ = require('lodash')

import GlobalStyles from "../Styles"

import { NativeModules} from 'react-native';

var Mailer = require('NativeModules').RNMail;
console.log("Mailer:", Mailer, Mailer.mail)

import {TextInput, SectionList, ScrollView, View, Alert, Keyboard} from 'react-native';

export default class Account extends Abstract {

  constructor(props) {
    super(props);
    this.state = {params: {email: "a@bitar.io", password: "password"}};
  }

  loadPasscodeStatus() {
    var hasPasscode = AuthenticationState.get().hasPasscode()
    this.setState(function(prevState){
      return _.merge(prevState, {hasPasscode: hasPasscode});
    })
  }

  componentDidMount() {
    this.loadPasscodeStatus();
    Auth.getInstance().serverUrl().then(function(server){
      this.setState(function(prevState) {
        var params = prevState.params;
        params.server = server;
        return _.merge(prevState, {params: params});
      })
    }.bind(this))
  }

  onNavigatorEvent(event) {
    super.onNavigatorEvent(event);

    switch(event.id) {
      case 'willAppear':
       this.loadPasscodeStatus();
       this.forceUpdate();
       break;
      }
  }

  validate(email, password) {
    if(!email) {
      Alert.alert('Missing Email', "Please enter a valid email address.", [{text: 'OK', onPress: () => console.log('OK Pressed')}])
      return false;
    }

    if(!password) {
      Alert.alert('Missing Password', "Please enter your password.", [{text: 'OK', onPress: () => console.log('OK Pressed')}])
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
          'Oops', error.message, [{text: 'OK', onPress: () => console.log('OK Pressed')},]
        )
        callback();
        return;
      }

      console.log("Logged in user: ", user);

      this.onAuthSuccess();
      callback();
    }.bind(this));
  }

  onRegisterPress = (params) => {
    console.log("Registering with params", params);

    Keyboard.dismiss();
    var email = params.email;
    var password = params.password;

    if(!this.validate(email, password)) {
      return;
    }

    this.setState(function(prevState){
      return _.merge(prevState, {params: params, confirmRegistration: true});
    })

  }

  onRegisterConfirmSuccess = () => {
    this.setState(function(prevState){
      return _.merge(prevState, {registering: true});
    })

    var params = this.state.params;

    console.log("Confirming with params", params);

    Auth.getInstance().register(params.email, params.password, params.server, function(user, error) {
      this.setState(function(prevState){
        return _.merge(prevState, {registering: false, confirmRegistration: false});
      })

      if(error) {
        Alert.alert(
          'Oops', error.message, [{text: 'OK', onPress: () => console.log('OK Pressed')},]
        )
        return;
      }

      console.log("Logged in user: ", user);

      this.onAuthSuccess();
    }.bind(this));
  }

  onRegisterConfirmCancel = () => {
    this.setState(function(prevState){
      return _.merge(prevState, {confirmRegistration: false});
    })
  }

  onAuthSuccess = () => {
    Sync.getInstance().markAllItemsDirtyAndSaveOffline();
    Sync.getInstance().sync(function(response){
      this.forceUpdate();
    }.bind(this));

    this.props.navigator.switchToTab({
      tabIndex: 0
    });
  }

  onSignOutPress = () => {
    Auth.getInstance().signout(() => {
      this.forceUpdate();
    })
  }

  async onExportPress() {
    var version = await Auth.getInstance().protocolVersion();
    var keys = Auth.getInstance().keys();

    var items = [];

    for(var item of ModelManager.getInstance().allItems) {
      var itemParams = new ItemParams(item, keys, version);
      var params = await itemParams.paramsForExportFile();
      items.push(params);
    }

    var data = {items: items}

    if(keys) {
      var authParams = await Auth.getInstance().savedAuthParams();
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
      attachment: {
        data: base64String,
        type: '.json',   // Mime Type: jpg, png, doc, ppt, html, pdf
        name: 'backup',   // Optional: Custom filename for attachment
      }
    }, (error, event) => {
        if(error) {
          Alert.alert('Error', 'Could not send mail. Please send a mail to support@example.com');
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
        onSetupSuccess: () => {}
      }
    });
  }

  onPasscodeDisable = () => {
    AlertManager.showConfirmationAlert(
      "Disable Passcode", "Are you sure you want to disable your local passcode?", "Disable Passcode",
      function(){
        AuthenticationState.get().clearPasscode();
        this.setState(function(prevState){
          return _.merge(prevState, {hasPasscode: false})
        })
        this.forceUpdate();
      }.bind(this)
    )
  }

  render() {
    let signedIn = !Auth.getInstance().offline();
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

          <OptionsSection signedIn={signedIn} title={"Options"} onSignOutPress={this.onSignOutPress} onExportPress={this.onExportPress} />

          <ThemesSection themes={GlobalStyles.get().themes()} title={"Themes"} onThemeSelect={this.onThemeSelect} onThemeLongPress={this.onThemeLongPress} />

          <PasscodeSection
            hasPasscode={this.state.hasPasscode}
            onEnable={this.onPasscodeEnable}
            onDisable={this.onPasscodeDisable}
            title={"Local Passcode"}
          />

        </ScrollView>
      </View>
    );
  }
}

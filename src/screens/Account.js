import React, { Component } from 'react';
import {ScrollView, View, Alert, Keyboard, Linking, Platform, Share, NativeModules} from 'react-native';

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
import AuthModal from "../containers/AuthModal"
import AuthSection from "../containers/account/AuthSection"
import RegistrationConfirmSection from "../containers/account/RegistrationConfirmSection"
import OptionsSection from "../containers/account/OptionsSection"
import PasscodeSection from "../containers/account/PasscodeSection"
import ThemesSection from "../containers/account/ThemesSection"
import EncryptionSection from "../containers/account/EncryptionSection"
import CompanySection from "../containers/account/CompanySection"
import LockedView from "../containers/LockedView";
import ApplicationState from "../ApplicationState";
import GlobalStyles from "../Styles"
import App from "../app"

var base64 = require('base-64');
var _ = require('lodash')
var Mailer = require('NativeModules').RNMail;

export default class Account extends Abstract {

  constructor(props) {
    super(props);

    this.constructState({params: {}});
  }

  loadInitialState() {
    super.loadInitialState();

    this.mergeState({params: {server: Auth.getInstance().serverUrl()}})

    this.dataLoadObserver = Sync.getInstance().registerInitialDataLoadObserver(function(){
      this.forceUpdate();
    }.bind(this))

    this.loadSecurityStatus();
  }

  loadSecurityStatus() {
    var hasPasscode = KeysManager.get().hasOfflinePasscode();
    var hasFingerprint = KeysManager.get().hasFingerprint();
    this.mergeState({hasPasscode: hasPasscode, hasFingerprint: hasFingerprint})
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    Sync.getInstance().removeDataLoadObserver(this.dataLoadObserver);
  }

  configureNavBar() {
    super.configureNavBar();

    if(App.get().isAndroid) {
      this.props.navigator.setButtons({
        leftButtons: [
          {
            title: "Close",
            id: 'cancel',
            showAsAction: 'ifRoom',
          },
        ],
        animated: false
      });
    }
  }

  onNavigatorEvent(event) {
    super.onNavigatorEvent(event);

    switch(event.id) {
      case 'willAppear':
       this.loadSecurityStatus();
       this.forceUpdate();
       break;
    }

    if (event.type == 'NavBarButtonPress') {
      if (event.id == 'cancel') {
        this.returnToNotesScreen();
      }
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
      if(callback) {callback(false);}
      return;
    }

    Auth.getInstance().login(email, password, params.server, function(user, error) {
      if(error) {
        Alert.alert(
          'Oops', error.message, [{text: 'OK'}]
        )
        if(callback) {callback(false);}
        return;
      }

      this.onAuthSuccess();
      if(callback) {
        callback(true);
      }
    }.bind(this));
  }

  onRegisterPress = (params, callback) => {
    Keyboard.dismiss();

    var email = params.email;
    var password = params.password;

    if(!this.validate(email, password)) {
      if(callback) {callback(false);}
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

  markAllDataDirtyAndSync(updateAfter = false) {
    Sync.getInstance().markAllItemsDirtyAndSaveOffline();
    Sync.getInstance().sync(function(response){
      if(updateAfter) {
        this.forceUpdate();
      }
    }.bind(this));
  }

  onAuthSuccess = () => {
    this.markAllDataDirtyAndSync();
    this.returnToNotesScreen();
  }

  returnToNotesScreen = () => {
    if(App.isIOS) {
      this.props.navigator.switchToTab({
        tabIndex: 0
      });
      this.forceUpdate();
    } else {
      this.dismissModal();
    }
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

  async onExportPress(callback) {
    var version = Auth.getInstance().protocolVersion();
    var keys = KeysManager.get().activeKeys();

    var items = [];

    for(var item of ModelManager.getInstance().allItems) {
      var itemParams = new ItemParams(item, keys, version);
      var params = await itemParams.paramsForExportFile();
      items.push(params);
    }

    if(items.length == 0) {
      Alert.alert('No Data', "You don't have any notes yet.");
      callback();
      return;
    }

    var data = {items: items}

    if(keys) {
      var authParams = KeysManager.get().activeAuthParams();
      // auth params are only needed when encrypted with a standard file key
      data["auth_params"] = authParams;
    }

    var encrypted = keys && keys !== null;

    var jsonString = JSON.stringify(data, null, 2 /* pretty print */);
    var base64String = base64.encode(jsonString);
    var fileType = App.isAndroid ? ".json" : "json"; // Android creates a tmp file and expects dot with extension

    Mailer.mail({
      subject: 'Standard Notes Backup',
      recipients: [''],
      body: '',
      isHTML: true,
      attachment: { data: App.isIOS ? jsonString : base64String, type: fileType, name: encrypted ? "SN-Encrypted-Backup" : 'SN-Decrypted-Backup' }
    }, (error, event) => {
        callback();
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
            this.markAllDataDirtyAndSync(true);
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
          this.markAllDataDirtyAndSync(true);
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
      Linking.openURL(`mailto:hello@standardnotes.org?subject=${platformString} app feedback (v${App.version})`);
    } else if(action == "learn_more") {
      Linking.openURL("https://standardnotes.org");
    } else if(action == "privacy") {
      Linking.openURL("https://standardnotes.org/privacy");
    } else if(action == "help") {
      Linking.openURL("https://standardnotes.org/help");
    } else if(action == "rate") {
      if(App.isIOS) {
        Linking.openURL("https://itunes.apple.com/us/app/standard-notes/id1285392450?ls=1&mt=8");
      } else {
        Linking.openURL("market://details?id=com.standardnotes");
      }
    } else if(action == "friend") {
      let title = "Standard Notes";
      var message = "Check out Standard Notes. It's a simple and private notes app. Thought you'd find it useful.";
      let url = "https://standardnotes.org";
      // Android ignores url. iOS ignores title.
      if(App.isAndroid) {
        message += "\n\n https://standardnotes.org";
      }

      Share.share({title: title, message: message, url: url})
    }
  }

  render() {
    if(this.state.lockContent) {
      return (<LockedView />);
    }

    let signedIn = !Auth.getInstance().offline();
    var themes = GlobalStyles.get().themes();

    return (
      <View style={GlobalStyles.styles().container}>
        <ScrollView style={{backgroundColor: GlobalStyles.constants().mainBackgroundColor}} keyboardShouldPersistTaps={'always'} keyboardDismissMode={'interactive'}>

          {!signedIn && !this.state.confirmRegistration &&
            <AuthSection
              params={this.state.params}
              confirmRegistration={this.state.confirmRegistration}
              title={"Account"}
              onSignInPress={this.onSignInPress}
              onRegisterPress={this.onRegisterPress}
            />
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

          <OptionsSection
            signedIn={signedIn}
            title={"Options"}
            onSignOutPress={this.onSignOutPress}
            onExportPress={this.onExportPress}
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

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
    var encryptedStorage = KeysManager.get().isStorageEncryptionEnabled();
    this.mergeState({hasPasscode: hasPasscode, hasFingerprint: hasFingerprint, storageEncryption: encryptedStorage})
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

    // Merge params back into our own state.params. The reason is, if you have immediate passcode enabled, and 2FA enabled
    // When you press sign in, see your 2fa prompt, exit the app to get your code and come back, the AuthSection component is destroyed.
    // Its data will need to be repopulated, and will use this.state.params
    this.mergeState({params: params});

    var email = params.email;
    var password = params.password;

    if(!this.validate(email, password)) {
      if(callback) {callback(false);}
      return;
    }

    var extraParams = {};
    if(this.state.mfa) {
      extraParams[this.state.mfa.payload.mfa_key] = params.mfa_token;
    }

    var strict = params.strictSignIn;

    // Prevent a timed sync from occuring while signing in. There may be a race condition where when
    // calling `markAllItemsDirtyAndSaveOffline` during sign in, if an authenticated sync happens to occur
    // right before that's called, items retreived from that sync will be marked as dirty, then resynced, causing mass duplication.
    // Unlock sync after all sign in processes are complete.
    Sync.getInstance().lockSyncing();

    Auth.getInstance().login(email, password, params.server, strict, extraParams, (user, error) => {

      if(error) {
        Sync.getInstance().unlockSyncing();

        if(error.tag == "mfa-required" || error.tag == "mfa-invalid") {
          this.mergeState({mfa: error});
        } else if(error.message) {
          Alert.alert('Oops', error.message, [{text: 'OK'}])
        }
        if(callback) {callback(false);}
        return;
      }

      params.email = null;
      params.password = null;
      this.setState({params: params});

      if(this.state.mfa) {
        this.mergeState({mfa: null});
      }

      this.onAuthSuccess(() => {
        Sync.getInstance().unlockSyncing();
        Sync.getInstance().sync();
      });

      callback && callback(true);
    });
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

    Auth.getInstance().register(params.email, params.password, params.server, (user, error) => {
      this.mergeState({registering: false, confirmRegistration: false});

      if(error) {
        Alert.alert('Oops', error.message, [{text: 'OK'}])
        return;
      }

      this.onAuthSuccess(() => {
        Sync.getInstance().sync();
      });
    });
  }

  onRegisterConfirmCancel = () => {
    this.mergeState({confirmRegistration: false});
  }

  resaveOfflineData(callback, updateAfter = false) {
    Sync.getInstance().resaveOfflineData(() => {
      if(updateAfter) {
        this.forceUpdate();
      }
      callback && callback();
    });
  }

  onAuthSuccess = (callback) => {
    Sync.getInstance().markAllItemsDirtyAndSaveOffline(() => {
      callback && callback();
      this.returnToNotesScreen();
    });
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
    AlertManager.confirm(
      "Sign Out?", "Signing out will remove all data from this device, including notes and tags. Make sure your data is synced before proceeding.", "Sign Out",
      function(){
        Auth.getInstance().signout(() => {
          this.forceUpdate();
        })
      }.bind(this)
    )
  }

  async onExportPress(encrypted, callback) {
    var version = Auth.getInstance().protocolVersion();
    var keys = encrypted ? KeysManager.get().activeKeys() : null;

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
    AlertManager.confirm(
      "Redownload Theme", "Themes are cached when downloaded. To retrieve the latest version, press Redownload.", "Redownload",
      function(){
        GlobalStyles.get().downloadThemeAndReload(theme);
      }.bind(this)
    )
  }

  onStorageEncryptionEnable = () => {
    AlertManager.confirm(
      "Enable Storage Encryption?", "Storage encryption improves your security by encrypting your data on your device. It may increase app start-up speed.", "Enable",
      () => {
        this.mergeState({storageEncryptionLoading: true});
        KeysManager.get().enableStorageEncryption();
        this.resaveOfflineData(() => {
          this.mergeState({storageEncryption: true, storageEncryptionLoading: false});
        });
      }
    )
  }

  onStorageEncryptionDisable = () => {
    AlertManager.confirm(
      "Disable Storage Encryption?", "Storage encryption improves your security by encrypting your data on your device. Disabling it can improve app start-up speed.", "Disable",
      () => {
        this.mergeState({storageEncryptionLoading: true});
        KeysManager.get().disableStorageEncryption();
        this.resaveOfflineData(() => {
          this.mergeState({storageEncryption: false, storageEncryptionLoading: false});
        });
      }
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
            this.resaveOfflineData(null, true);
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

    AlertManager.confirm(
      "Disable Passcode", message, "Disable Passcode",
      function(){
        var result = KeysManager.get().clearOfflineKeysAndData();

        if(encryptionSource == "offline") {
          // remove encryption from all items
          this.resaveOfflineData(null, true);
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
        message += "\n\nhttps://standardnotes.org";
      }

      ApplicationState.get().performActionWithoutStateChangeImpact(() => {
        Share.share({title: title, message: message, url: url})
      })
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
              mfa={this.state.mfa}
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
            encryptionAvailable={KeysManager.get().activeKeys()}
            onSignOutPress={this.onSignOutPress}
            onExportPress={this.onExportPress}
            email={KeysManager.get().getUserEmail()}
          />

          <ThemesSection themes={themes} title={"Themes"} onThemeSelect={this.onThemeSelect} onThemeLongPress={this.onThemeLongPress} />

          <PasscodeSection
            hasPasscode={this.state.hasPasscode}
            hasFingerprint={this.state.hasFingerprint}
            storageEncryption={this.state.storageEncryption}
            storageEncryptionLoading={this.state.storageEncryptionLoading}
            onStorageEncryptionEnable={this.onStorageEncryptionEnable}
            onStorageEncryptionDisable={this.onStorageEncryptionDisable}
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

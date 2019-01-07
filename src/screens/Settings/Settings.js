import React, { Component } from 'react';
import {ScrollView, View, Alert, Keyboard, Linking, Platform, Share, NativeModules} from 'react-native';

import Sync from '@SFJS/syncManager'
import ModelManager from '@SFJS/modelManager'
import AlertManager from '@SFJS/alertManager'
import SF from '@SFJS/sfjs'
import Storage from "@SFJS/storageManager"

import Auth from '@SFJS/authManager'
import KeysManager from '@Lib/keysManager'
import UserPrefsManager from '@Lib/userPrefsManager'
import OptionsState from "@Lib/OptionsState"
import ApplicationState from "@Lib/ApplicationState"
import StyleKit from "@Style/StyleKit"
import BackupsManager from "@Lib/BackupsManager"

import SectionHeader from "@Components/SectionHeader";
import ButtonCell from "@Components/ButtonCell";
import TableSection from "@Components/TableSection";
import SectionedTableCell from "@Components/SectionedTableCell";
import SectionedAccessoryTableCell from "@Components/SectionedAccessoryTableCell";
import Abstract from "@Screens/Abstract"
import Authenticate from "@Screens/Authentication/Authenticate"
import LockedView from "@Containers/LockedView";

import AuthSection from "@Screens/Settings/Sections/AuthSection"
import RegistrationConfirmSection from "@Screens/Settings/Sections/RegistrationConfirmSection"
import OptionsSection from "@Screens/Settings/Sections/OptionsSection"
import PasscodeSection from "@Screens/Settings/Sections/PasscodeSection"
import EncryptionSection from "@Screens/Settings/Sections/EncryptionSection"
import CompanySection from "@Screens/Settings/Sections/CompanySection"

export default class Settings extends Abstract {

  static navigationOptions = ({ navigation, navigationOptions }) => {
    let templateOptions = {
      title: "Settings",
      leftButton: {
        title: "Done"
      }
    }
    return Abstract.getDefaultNavigationOptions({navigation, navigationOptions, templateOptions});
  };

  constructor(props) {
    super(props);

    props.navigation.setParams({
      leftButton: {
        title: "Done",
        onPress: () => {
          this.dismiss();
        }
      }
    })

    this.sortOptions = [
      {key: "created_at", label: "Date Added"},
      {key: "client_updated_at", label: "Date Modified"},
      {key: "title", label: "Title"},
    ];

    this.options = ApplicationState.getOptions();
    this.constructState({params: {}});
  }

  loadInitialState() {
    super.loadInitialState();

    this.mergeState({params: {server: Auth.get().serverUrl()}})

    this.syncEventHandler = Sync.get().addEventHandler((event, data) => {
      if(event == "local-data-loaded") {
        this.forceUpdate();
      } else if(event == "sync-session-invalid") {
        if(!this.didShowSessionInvalidAlert) {
          this.didShowSessionInvalidAlert = true;
          AlertManager.get().confirm({
            title: "Session Expired",
            text: "Your session has expired. New changes will not be pulled in. Please sign out and sign back in to refresh your session.",
            confirmButtonText: "Sign Out",
            onConfirm: () => {
              this.didShowSessionInvalidAlert = false;
              Auth.get().signout();
            },
            onCancel: () => {
              this.didShowSessionInvalidAlert = false;
            }
          })
        }
      }
    })

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
    Sync.get().removeEventHandler(this.syncEventHandler);
  }

  componentWillFocus() {
    super.componentWillFocus();
    this.loadLastExportDate();
  }

  async loadLastExportDate() {
    UserPrefsManager.get().getLastExportDate().then((date) => {
      this.setState({lastExportDate: date});
    })
  }

  componentDidFocus() {
    super.componentDidFocus();
    this.loadSecurityStatus();
    this.forceUpdate();
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
    Sync.get().lockSyncing();

    Auth.get().login(params.server, email, password, strict, extraParams).then((response) => {

      if(!response || response.error) {
        var error = response ? response.error : {message: "An unknown error occured."}

        Sync.get().unlockSyncing();

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
        Sync.get().unlockSyncing();
        Sync.get().sync();
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

    Auth.get().register( params.server, params.email, params.password).then((response) => {
      this.mergeState({registering: false, confirmRegistration: false});

      if(!response || response.error) {
        var error = response ? response.error : {message: "An unknown error occured."}
        Alert.alert('Oops', error.message, [{text: 'OK'}])
        return;
      }

      this.onAuthSuccess(() => {
        Sync.get().sync();
      });
    });
  }

  onRegisterConfirmCancel = () => {
    this.mergeState({confirmRegistration: false});
  }

  resaveOfflineData(callback, updateAfter = false) {
    Sync.get().resaveOfflineData().then(() => {
      if(updateAfter) {
        this.forceUpdate();
      }
      callback && callback();
    });
  }

  onAuthSuccess = (callback) => {
    Sync.get().markAllItemsDirtyAndSaveOffline(false).then(() => {
      callback && callback();
      this.dismiss();
    });
  }

  onSignOutPress = () => {
    AlertManager.get().confirm({
      title: "Sign Out?",
      text: "Signing out will remove all data from this device, including notes and tags. Make sure your data is synced before proceeding.",
      confirmButtonText: "Sign Out",
      onConfirm: () => {
        Auth.get().signout().then(() => {
          console.log("Signed out");
          this.forceUpdate();
        })
      }
    })
  }

  onExportPress = async (encrypted, callback) => {
    this.handlePrivilegedAction(true, SFPrivilegesManager.ActionManageBackups, async () => {
      BackupsManager.get().export(encrypted, callback).then((success) => {
        if(success) {
          var date = new Date();
          this.setState({lastExportDate: date});
          UserPrefsManager.get().setLastExportDate(date);
        }
        callback();
      })
    });
  }

  onStorageEncryptionEnable = () => {
    AlertManager.get().confirm({
      title: "Enable Storage Encryption?",
      text: "Storage encryption improves your security by encrypting your data on your device. It may increase app start-up speed.",
      confirmButtonText: "Enable",
      onConfirm: () => {
        this.mergeState({storageEncryptionLoading: true});
        KeysManager.get().enableStorageEncryption();
        this.resaveOfflineData(() => {
          this.mergeState({storageEncryption: true, storageEncryptionLoading: false});
        });
      }
    })
  }

  onStorageEncryptionDisable = () => {
    AlertManager.get().confirm({
      title: "Disable Storage Encryption?",
      text: "Storage encryption improves your security by encrypting your data on your device. Disabling it can improve app start-up speed.",
      confirmButtonText: "Disable",
      onConfirm: () => {
        this.mergeState({storageEncryptionLoading: true});
        KeysManager.get().disableStorageEncryption();
        this.resaveOfflineData(() => {
          this.mergeState({storageEncryption: false, storageEncryptionLoading: false});
        });
      }
    })
  }

  onPasscodeEnable = () => {
    this.props.navigation.navigate("InputModal", {
      title: "Setup Passcode",
      placeholder: "Enter a passcode",
      confirmPlaceholder: "Confirm passcode",
      secureTextEntry: true,
      requireConfirm: true,
      showKeyboardChooser: true,
      onSubmit: async (value) => {
        console.log("Setting up local passcode", value);
        let identifier = await SF.get().crypto.generateUUID();

        SF.get().crypto.generateInitialKeysAndAuthParamsForUser(identifier, value).then((results) => {
          let keys = results.keys;
          let authParams = results.authParams;

          // make sure it has valid items
          if(_.keys(keys).length > 0) {
            KeysManager.get().persistOfflineKeys(keys);
            KeysManager.get().setOfflineAuthParams(authParams);
            var encryptionSource = KeysManager.get().encryptionSource();
            if(encryptionSource == "offline") {
              this.resaveOfflineData(null, true);
            }
          } else {
            this.mergeState({setupButtonText: SAVE_BUTTON_DEFAULT_TEXT, setupButtonEnabled: true});
            Alert.alert("Passcode Error", "There was an error setting up your passcode. Please try again.");
          }
        });
      },
      onKeyboardTypeChange: (type) => {
        Storage.get().setItem("passcodeKeyboardType", type);
      }
    });
  }

  onPasscodeDisable = () => {
    this.handlePrivilegedAction(true, SFPrivilegesManager.ActionManagePasscode, () => {
      var encryptionSource = KeysManager.get().encryptionSource();
      var message;
      if(encryptionSource == "account") {
        message = "Are you sure you want to disable your local passcode? This will not affect your encryption status, as your data is currently being encrypted through your sync account keys.";
      } else if(encryptionSource == "offline") {
        message = "Are you sure you want to disable your local passcode? This will disable encryption on your data.";
      }

      AlertManager.get().confirm({
        title: "Disable Passcode",
        text: message,
        confirmButtonText: "Disable Passcode",
        onConfirm: async () => {
          var result = await KeysManager.get().clearOfflineKeysAndData();
          if(encryptionSource == "offline") {
            // remove encryption from all items
            this.resaveOfflineData(null, true);
          }

          this.mergeState({hasPasscode: false});
          this.forceUpdate();
        }
      })
    })
  }

  onFingerprintEnable = () => {
    KeysManager.get().enableFingerprint();
    this.loadSecurityStatus();
  }

  onFingerprintDisable = () => {
    this.handlePrivilegedAction(true, SFPrivilegesManager.ActionManagePasscode, () => {
      KeysManager.get().disableFingerprint();
      this.loadSecurityStatus();
    });
  }

  onSortChange = (key) => {
    this.options.setSortBy(key);
    this.forceUpdate();
  }

  onOptionSelect = (option) => {
    this.options.setDisplayOptionKeyValue(option, !this.options.getDisplayOptionValue(option));
    this.forceUpdate();
  }

  toggleSortReverse = () => {
    this.options.setSortReverse(!this.options.sortReverse);
    this.forceUpdate();
  }

  render() {
    if(this.state.lockContent) {
      return (<LockedView />);
    }

    let signedIn = !Auth.get().offline();

    return (
      <View style={StyleKit.styles.container}>
        <ScrollView style={{backgroundColor: StyleKit.variable("stylekitBackgroundColor")}} keyboardShouldPersistTaps={'always'} keyboardDismissMode={'interactive'}>

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
            lastExportDate={this.state.lastExportDate}
            title={"Options"}
            encryptionAvailable={KeysManager.get().activeKeys()}
            onSignOutPress={this.onSignOutPress}
            onExportPress={this.onExportPress}
            email={KeysManager.get().getUserEmail()}
          />


          <TableSection>
            <SectionHeader title={"Sort Notes By"} buttonText={this.options.sortReverse ? "Disable Reverse Sort" : "Enable Reverse Sort"} buttonAction={this.toggleSortReverse} />
            {this.sortOptions.map((option, i) => {
              return (
                <SectionedAccessoryTableCell
                  onPress={() => {this.onSortChange(option.key)}}
                  text={option.label}
                  key={option.key}
                  first={i == 0}
                  last={i == this.sortOptions.length - 1}
                  selected={() => {return option.key == this.options.sortBy}}
                />
              )
            })}
          </TableSection>

          <TableSection>
            <SectionHeader title={"Note List Options"} />

            <SectionedAccessoryTableCell
              onPress={() => {this.onOptionSelect('hidePreviews')}}
              text={"Hide note previews"}
              first={true}
              selected={() => {return this.options.hidePreviews}}
            />

            <SectionedAccessoryTableCell
              onPress={() => {this.onOptionSelect('hideTags')}}
              text={"Hide note tags"}
              selected={() => {return this.options.hideTags}}
            />

            <SectionedAccessoryTableCell
              onPress={() => {this.onOptionSelect('hideDates')}}
              text={"Hide note dates"}
              last={true}
              selected={() => {return this.options.hideDates}}
            />

          </TableSection>

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

          <CompanySection title={"Standard Notes"}/>

        </ScrollView>
      </View>
    );
  }
}

import React, { Component } from 'react';
import {ScrollView, View, Alert, Keyboard, Platform} from 'react-native';

import Sync from '@SFJS/syncManager'
import ModelManager from '@SFJS/modelManager'
import AlertManager from '@SFJS/alertManager'
import SF from '@SFJS/sfjs'
import Auth from '@SFJS/authManager'
import Storage from "@SFJS/storageManager"

import KeysManager from '@Lib/keysManager'
import OptionsState from "@Lib/OptionsState"
import ApplicationState from "@Lib/ApplicationState"
import StyleKit from "@Style/StyleKit"

import SectionHeader from "@Components/SectionHeader";
import TableSection from "@Components/TableSection";
import SectionedAccessoryTableCell from "@Components/SectionedAccessoryTableCell";
import Abstract from "@Screens/Abstract"
import LockedView from "@Containers/LockedView";

import AuthSection from "@Screens/Settings/Sections/AuthSection"
import OptionsSection from "@Screens/Settings/Sections/OptionsSection"
import PasscodeSection from "@Screens/Settings/Sections/PasscodeSection"
import EncryptionSection from "@Screens/Settings/Sections/EncryptionSection"
import CompanySection from "@Screens/Settings/Sections/CompanySection"

export default class Settings extends Abstract {

  static navigationOptions = ({ navigation, navigationOptions }) => {
    let templateOptions = {
      title: "Settings",
      leftButton: {
        title: ApplicationState.isIOS ? "Done" : null,
        iconName: ApplicationState.isIOS ? null : StyleKit.nameForIcon("checkmark"),
      }
    }
    return Abstract.getDefaultNavigationOptions({navigation, navigationOptions, templateOptions});
  };

  constructor(props) {
    super(props);

    props.navigation.setParams({
      leftButton: {
        title: ApplicationState.isIOS ? "Done" : null,
        iconName: ApplicationState.isIOS ? null : StyleKit.nameForIcon("checkmark"),
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
    this.constructState({});
  }

  loadInitialState() {
    super.loadInitialState();

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

  componentDidFocus() {
    super.componentDidFocus();
    this.loadSecurityStatus();
    this.forceUpdate();
  }

  resaveOfflineData(callback, updateAfter = false) {
    Sync.get().resaveOfflineData().then(() => {
      if(updateAfter) {
        this.forceUpdate();
      }
      callback && callback();
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
        let identifier = await SF.get().crypto.generateUUID();

        SF.get().crypto.generateInitialKeysAndAuthParamsForUser(identifier, value).then((results) => {
          let keys = results.keys;
          let authParams = results.authParams;

          // make sure it has valid items
          if(_.keys(keys).length > 0) {
            KeysManager.get().setOfflineAuthParams(authParams);
            KeysManager.get().persistOfflineKeys(keys);
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
              title={"Account"}
              onAuthSuccess = {() => {this.dismiss()}}
            />
          }

          <OptionsSection
            title={"Options"}
            onSignOutPress={this.onSignOutPress}
            onManagePrivileges={() => {this.props.navigation.navigate("ManagePrivileges")}}
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

          <EncryptionSection title={"Encryption Status"}/>

          <CompanySection title={"Standard Notes"}/>

        </ScrollView>
      </View>
    );
  }
}

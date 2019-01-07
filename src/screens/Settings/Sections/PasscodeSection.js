import React, { Component } from 'react';
import StyleKit from "@Style/StyleKit"
import {TextInput, View, Alert, Text} from 'react-native';

import SectionHeader from "@Components/SectionHeader";
import ButtonCell from "@Components/ButtonCell";
import TableSection from "@Components/TableSection";
import SectionedTableCell from "@Components/SectionedTableCell";
import SectionedAccessoryTableCell from "@Components/SectionedAccessoryTableCell";
import SectionedOptionsTableCell from "@Components/SectionedOptionsTableCell";

import ApplicationState from "@Lib/ApplicationState"
import FingerprintScanner from 'react-native-fingerprint-scanner';
import KeysManager from "@Lib/keysManager"

export default class PasscodeSection extends Component {

  constructor(props) {
    super(props);
    var state = { fingerprintAvailable: false || __DEV__};
    if(__DEV__) {
      state.biometricsType = ApplicationState.isAndroid ? "touch" : "face";
      state.biometricsNoun = ApplicationState.isAndroid ? "Fingerprint" : "Face ID";
    }

    this.state = state;
  }

  componentDidMount() {
    KeysManager.getDeviceBiometricsAvailability((available, type, noun) => {
      this.setState({fingerprintAvailable: available, biometricsType: type, biometricsNoun: noun})
    })
  }

  onPasscodeOptionPress = (option) => {
    KeysManager.get().setPasscodeTiming(option.key);
    this.forceUpdate();
  }

  onFingerprintOptionPress = (option) => {
    KeysManager.get().setFingerprintTiming(option.key);
    this.forceUpdate();
  }

  render() {
    var source = KeysManager.get().encryptionSource();
    var encryptionAvailable = source !== null;

    var storageEncryptionTitle = encryptionAvailable ? (this.props.storageEncryption ? "Disable Storage Encryption" : "Enable Storage Encryption") : "Storage Encryption";
    var storageOnPress = this.props.storageEncryption ? this.props.onStorageEncryptionDisable : this.props.onStorageEncryptionEnable;
    var storageSubText = "Encrypts your data before saving to your device's local storage.";

    if(encryptionAvailable) {
      storageSubText += this.props.storageEncryption ?" Disable to improve app start-up speed." : " May decrease app start-up speed.";
    } else {
      storageSubText += " Sign in, register, or add a local passcode to enable this option.";
      storageOnPress = null;
    }

    if(this.props.storageEncryptionLoading) {
      storageSubText = "Applying changes...";
    }

    var passcodeTitle = this.props.hasPasscode ? "Disable Passcode Lock" : "Enable Passcode Lock";
    var passcodeOnPress = this.props.hasPasscode ? this.props.onDisable : this.props.onEnable;

    var biometricsNoun = this.state.biometricsNoun;

    var fingerprintTitle = this.props.hasFingerprint ? `Disable ${biometricsNoun} Lock` : `Enable ${biometricsNoun} Lock`;
    var fingerprintOnPress = this.props.hasFingerprint ? this.props.onFingerprintDisable : this.props.onFingerprintEnable;

    var passcodeOptions = KeysManager.get().getPasscodeTimingOptions();
    var fingerprintOptions = KeysManager.get().getFingerprintTimingOptions();

    if(!this.state.fingerprintAvailable) {
      fingerprintTitle = "Enable Fingerprint Lock (Not Available)"
      fingerprintOnPress = function() {
        Alert.alert("Not Available", "Your device does not support fingerprint authentication.");
      }
    }
    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        <ButtonCell first={true} leftAligned={true} title={storageEncryptionTitle} onPress={storageOnPress}>
          <Text style={{color: StyleKit.variable("stylekitNeutralColor"), marginTop: 2}}>{storageSubText}</Text>
        </ButtonCell>

        <ButtonCell leftAligned={true} title={passcodeTitle} onPress={passcodeOnPress} />

        <ButtonCell last={!this.props.hasFingerprint && !this.props.hasPasscode} disabled={!this.state.fingerprintAvailable} leftAligned={true} title={fingerprintTitle} onPress={fingerprintOnPress} />

        {this.props.hasPasscode &&
          <SectionedOptionsTableCell last={!this.props.hasFingerprint} title={"Require Passcode"} options={passcodeOptions} onPress={this.onPasscodeOptionPress}/>
        }

        {this.props.hasFingerprint &&
          <SectionedOptionsTableCell last={true} title={`Require ${biometricsNoun}`} options={fingerprintOptions} onPress={this.onFingerprintOptionPress}/>
        }

      </TableSection>
    );
  }
}

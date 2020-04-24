import React, { Component } from 'react';
import { Alert, Text } from 'react-native';
import ButtonCell from '@Components/ButtonCell';
import SectionHeader from '@Components/SectionHeader';
import SectionedOptionsTableCell from '@Components/SectionedOptionsTableCell';
import TableSection from '@Components/TableSection';
import ApplicationState from '@Lib/ApplicationState';
import KeysManager from '@Lib/keysManager';
import StyleKit from '@Style/StyleKit';

export default class PasscodeSection extends Component {
  constructor(props) {
    super(props);
    let state = { biometricsAvailable: false || __DEV__ };
    if (__DEV__) {
      state.biometricsType = ApplicationState.isAndroid
        ? 'Fingerprint'
        : 'Face ID';
      state.biometricsNoun = ApplicationState.isAndroid
        ? 'Fingerprint'
        : 'Face ID';
    }

    this.state = state;
  }

  componentDidMount() {
    KeysManager.getDeviceBiometricsAvailability((available, type, noun) => {
      this.setState({
        biometricsAvailable: available,
        biometricsType: type,
        biometricsNoun: noun,
      });
    });
  }

  onPasscodeOptionPress = option => {
    KeysManager.get().setPasscodeTiming(option.key);
    this.forceUpdate();
  };

  onBiometricsOptionPress = option => {
    KeysManager.get().setBiometricsTiming(option.key);
    this.forceUpdate();
  };

  render() {
    const source = KeysManager.get().encryptionSource();
    const encryptionAvailable = source !== null;

    const storageEncryptionTitle = encryptionAvailable
      ? this.props.storageEncryption
        ? 'Disable Storage Encryption'
        : 'Enable Storage Encryption'
      : 'Storage Encryption';
    let storageOnPress = this.props.storageEncryption
      ? this.props.onStorageEncryptionDisable
      : this.props.onStorageEncryptionEnable;
    let storageSubText =
      "Encrypts your data before saving to your device's local storage.";

    if (encryptionAvailable) {
      storageSubText += this.props.storageEncryption
        ? ' Disable to improve app start-up speed.'
        : ' May decrease app start-up speed.';
    } else {
      storageSubText +=
        ' Sign in, register, or add a local passcode to enable this option.';
      storageOnPress = null;
    }

    if (this.props.storageEncryptionLoading) {
      storageSubText = 'Applying changes...';
    }

    const passcodeTitle = this.props.hasPasscode
      ? 'Disable Passcode Lock'
      : 'Enable Passcode Lock';
    const passcodeOnPress = this.props.hasPasscode
      ? this.props.onDisable
      : this.props.onEnable;

    const { biometricsNoun } = this.state;

    let biometricTitle = this.props.hasBiometrics
      ? `Disable ${biometricsNoun} Lock`
      : `Enable ${biometricsNoun} Lock`;
    let biometricOnPress = this.props.hasBiometrics
      ? this.props.onFingerprintDisable
      : this.props.onFingerprintEnable;

    const passcodeOptions = KeysManager.get().getPasscodeTimingOptions();
    const biometricOptions = KeysManager.get().getBiometricsTimingOptions();

    if (!this.state.biometricsAvailable) {
      biometricTitle = 'Enable Biometric Lock (Not Available)';
      biometricOnPress = () => {
        Alert.alert(
          'Not Available',
          'Your device does not support biometric authentication.'
        );
      };
    }
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        <ButtonCell
          first={true}
          leftAligned={true}
          title={storageEncryptionTitle}
          onPress={storageOnPress}
        >
          <Text
            style={{
              color: StyleKit.variables.stylekitNeutralColor,
              marginTop: 2,
            }}
          >
            {storageSubText}
          </Text>
        </ButtonCell>

        <ButtonCell
          leftAligned={true}
          title={passcodeTitle}
          onPress={passcodeOnPress}
        />

        <ButtonCell
          last={!this.props.hasBiometrics && !this.props.hasPasscode}
          disabled={!this.state.biometricsAvailable}
          leftAligned={true}
          title={biometricTitle}
          onPress={biometricOnPress}
        />

        {this.props.hasPasscode && (
          <SectionedOptionsTableCell
            last={!this.props.hasBiometrics}
            title={'Require Passcode'}
            options={passcodeOptions}
            onPress={this.onPasscodeOptionPress}
          />
        )}

        {this.props.hasBiometrics && (
          <SectionedOptionsTableCell
            last={true}
            title={`Require ${biometricsNoun}`}
            options={biometricOptions}
            onPress={this.onBiometricsOptionPress}
          />
        )}
      </TableSection>
    );
  }
}

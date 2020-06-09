import React, { Component } from 'react';
import { Alert, Text } from 'react-native';
import ButtonCell from '@Components/ButtonCell';
import SectionHeader from '@Components/SectionHeader';
import SectionedOptionsTableCell from '@Components/SectionedOptionsTableCell';
import TableSection from '@Components/TableSection';
import ApplicationState from '@Lib/ApplicationState';
import KeysManager, { BiometricsType } from '@Lib/keysManager';
import { ApplicationContext } from '@Root/ApplicationContext';

type Props = {
  hasBiometrics: boolean;
  hasPasscode: boolean;
  title: string;
  onDisable: () => void;
  onEnable: () => void;
  storageEncryption: boolean | null;
  onStorageEncryptionDisable: () => void;
  onStorageEncryptionEnable: () => void;
  storageEncryptionLoading: boolean;
  onFingerprintDisable: () => void;
  onFingerprintEnable: () => void;
};

type State = {
  biometricsAvailable?: boolean;
  biometricsType?: BiometricsType;
  biometricsNoun?: string;
};

export default class PasscodeSection extends Component<Props, State> {
  static contextType = ApplicationContext;
  context!: React.ContextType<typeof ApplicationContext>;
  constructor(props: Readonly<Props>) {
    super(props);
    let state: State = { biometricsAvailable: false || __DEV__ };
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

  onPasscodeOptionPress = (option: { key: string | null }) => {
    KeysManager.get().setPasscodeTiming(option.key);
    this.forceUpdate();
  };

  onBiometricsOptionPress = (option: { key: any }) => {
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
    let storageOnPress: (() => void) | null = this.props.storageEncryption
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
          onPress={storageOnPress !== null ? storageOnPress : () => undefined}
        >
          <Text
            style={{
              color: this.context?.getThemeService().variables
                .stylekitNeutralColor,
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
            title={'Require Passcode'}
            options={passcodeOptions}
            onPress={this.onPasscodeOptionPress}
          />
        )}

        {this.props.hasBiometrics && (
          <SectionedOptionsTableCell
            title={`Require ${biometricsNoun}`}
            options={biometricOptions}
            onPress={this.onBiometricsOptionPress}
          />
        )}
      </TableSection>
    );
  }
}

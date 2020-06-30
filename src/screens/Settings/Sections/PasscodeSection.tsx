import React, { useState, useContext, useEffect } from 'react';
import { Title } from './PasscodeSection.styled';
import { TableSection } from '@Components/TableSection';
import { SectionHeader } from '@Components/SectionHeader';
import { ButtonCell } from '@Components/ButtonCell';
import { SectionedOptionsTableCell } from '@Components/SectionedOptionsTableCell';
import { ApplicationContext } from '@Root/ApplicationContext';
import { StorageEncryptionPolicies } from 'snjs';

type Props = {
  title: string;
};

export const PasscodeSection = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [encryptionAvailable, setEncryptionAvailable] = useState(false);
  const [hasPasscode] = useState(() => application?.hasPasscode());
  const [encryptionPolicy, setEncryptionPolicy] = useState(() =>
    application?.getStorageEncryptionPolicy()
  );
  const [
    encryptionPolictChangeInProgress,
    setEncryptionPolictChangeInProgress,
  ] = useState(false);

  useEffect(() => {
    const getEncryptionAvailable = async () => {
      setEncryptionAvailable(
        Boolean(await application?.isEncryptionAvailable())
      );
    };
    getEncryptionAvailable();
  }, [application]);

  const toggleEncryptionPolicy = async () => {
    if (!encryptionAvailable) {
      return;
    }

    if (encryptionPolicy === StorageEncryptionPolicies.Default) {
      setEncryptionPolictChangeInProgress(true);
      setEncryptionPolicy(StorageEncryptionPolicies.Disabled);
      await application?.setStorageEncryptionPolicy(
        StorageEncryptionPolicies.Disabled
      );
      setEncryptionPolictChangeInProgress(false);
    } else if (encryptionPolicy === StorageEncryptionPolicies.Disabled) {
      setEncryptionPolictChangeInProgress(true);
      setEncryptionPolicy(StorageEncryptionPolicies.Default);
      await application?.setStorageEncryptionPolicy(
        StorageEncryptionPolicies.Default
      );
      setEncryptionPolictChangeInProgress(false);
    }
  };

  // State
  const storageEncryptionTitle = encryptionAvailable
    ? encryptionPolicy === StorageEncryptionPolicies.Default
      ? 'Disable Storage Encryption'
      : 'Enable Storage Encryption'
    : 'Storage Encryption';

  let storageSubText =
    "Encrypts your data before saving to your device's local storage.";

  if (encryptionAvailable) {
    storageSubText +=
      encryptionPolicy === StorageEncryptionPolicies.Default
        ? ' Disable to improve app start-up speed.'
        : ' May decrease app start-up speed.';
  } else {
    storageSubText +=
      ' Sign in, register, or add a local passcode to enable this option.';
  }

  if (encryptionPolictChangeInProgress) {
    storageSubText = 'Applying changes...';
  }

  const passcodeTitle = hasPasscode
    ? 'Disable Passcode Lock'
    : 'Enable Passcode Lock';
  const passcodeOnPress = () => {};
  // ? this.props.onDisable
  // : this.props.onEnable;

  // const { biometricsNoun } = this.state;

  // let biometricTitle = this.props.hasBiometrics
  //   ? `Disable ${biometricsNoun} Lock`
  //   : `Enable ${biometricsNoun} Lock`;
  // let biometricOnPress = this.props.hasBiometrics
  //   ? this.props.onFingerprintDisable
  //   : this.props.onFingerprintEnable;
  return (
    <TableSection>
      <SectionHeader title={props.title} />

      <ButtonCell
        first
        leftAligned
        title={storageEncryptionTitle}
        onPress={toggleEncryptionPolicy}
      >
        <Title>{storageSubText}</Title>
      </ButtonCell>

      <ButtonCell leftAligned title={passcodeTitle} onPress={passcodeOnPress} />

      {/* <ButtonCell
        last={!this.props.hasBiometrics && !hasPasscode}
        disabled={!this.state.biometricsAvailable}
        leftAligned
        title={biometricTitle}
        onPress={biometricOnPress}
      /> */}

      {hasPasscode && (
        <SectionedOptionsTableCell
          title={'Require Passcode'}
          options={[]}
          onPress={() => {}}
        />
      )}

      {/* {this.props.hasBiometrics && (
        <SectionedOptionsTableCell
          title={`Require ${biometricsNoun}`}
          options={biometricOptions}
          onPress={this.onBiometricsOptionPress}
        />
      )} */}
    </TableSection>
  );
};

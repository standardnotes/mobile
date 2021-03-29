import { ButtonCell } from '@Components/ButtonCell';
import {
  Option,
  SectionedOptionsTableCell,
} from '@Components/SectionedOptionsTableCell';
import { SectionHeader } from '@Components/SectionHeader';
import { TableSection } from '@Components/TableSection';
import { UnlockTiming } from '@Lib/application_state';
import { MobileDeviceInterface } from '@Lib/interface';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ModalStackNavigationProp } from '@Root/ModalStack';
import { SCREEN_INPUT_MODAL_PASSCODE, SCREEN_SETTINGS } from '@Screens/screens';
import { StorageEncryptionPolicies } from '@standardnotes/snjs';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Title } from './SecuritySection.styled';

type Props = {
  title: string;
  hasPasscode: boolean;
  encryptionAvailable: boolean;
  updateProtectionsAvailable: Function;
};

export const SecuritySection = (props: Props) => {
  const navigation = useNavigation<
    ModalStackNavigationProp<typeof SCREEN_SETTINGS>['navigation']
  >();
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [encryptionPolicy, setEncryptionPolicy] = useState(() =>
    application?.getStorageEncryptionPolicy()
  );
  const [
    encryptionPolictChangeInProgress,
    setEncryptionPolictChangeInProgress,
  ] = useState(false);
  const [hasScreenshotPrivacy, setHasScreenshotPrivacy] = useState<
    boolean | undefined
  >(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [supportsBiometrics, setSupportsBiometrics] = useState(false);
  const [biometricsTimingOptions, setBiometricsTimingOptions] = useState(() =>
    application!.getAppState().getBiometricsTimingOptions()
  );
  const [passcodeTimingOptions, setPasscodeTimingOptions] = useState(() =>
    application!.getAppState().getPasscodeTimingOptions()
  );

  useEffect(() => {
    let mounted = true;
    const getHasScreenshotPrivacy = async () => {
      const hasScreenshotPrivacyEnabled = await application?.getAppState()
        .screenshotPrivacyEnabled;
      if (mounted) {
        setHasScreenshotPrivacy(hasScreenshotPrivacyEnabled);
      }
    };
    getHasScreenshotPrivacy();
    const getHasBiometrics = async () => {
      const appHasBiometrics = await application!.hasBiometrics();
      if (mounted) {
        setHasBiometrics(appHasBiometrics);
      }
    };
    getHasBiometrics();
    const hasBiometricsSupport = async () => {
      const hasBiometricsAvailable = await (application?.deviceInterface as MobileDeviceInterface).getDeviceBiometricsAvailability();
      if (mounted) {
        setSupportsBiometrics(hasBiometricsAvailable);
      }
    };
    hasBiometricsSupport();
    return () => {
      mounted = false;
    };
  }, [application]);

  useFocusEffect(
    useCallback(() => {
      if (props.hasPasscode) {
        setPasscodeTimingOptions(() =>
          application!.getAppState().getPasscodeTimingOptions()
        );
      }
    }, [application, props.hasPasscode])
  );

  const toggleEncryptionPolicy = async () => {
    if (!props.encryptionAvailable) {
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
  const storageEncryptionTitle = props.encryptionAvailable
    ? encryptionPolicy === StorageEncryptionPolicies.Default
      ? 'Disable Storage Encryption'
      : 'Enable Storage Encryption'
    : 'Storage Encryption';

  let storageSubText =
    "Encrypts your data before saving to your device's local storage.";

  if (props.encryptionAvailable) {
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

  const screenshotPrivacyTitle = hasScreenshotPrivacy
    ? 'Disable Multitasking/Screenshot Privacy'
    : 'Enable Multitasking/Screenshot Privacy';

  const passcodeTitle = props.hasPasscode
    ? 'Disable Passcode Lock'
    : 'Enable Passcode Lock';

  const biometricTitle = hasBiometrics
    ? 'Disable Biometrics Lock'
    : 'Enable Biometrics Lock';

  const setBiometricsTiming = async (timing: UnlockTiming) => {
    await application?.getAppState().setBiometricsTiming(timing);
    setBiometricsTimingOptions(() =>
      application!.getAppState().getBiometricsTimingOptions()
    );
  };

  const setPasscodeTiming = async (timing: UnlockTiming) => {
    await application?.getAppState().setPasscodeTiming(timing);
    setPasscodeTimingOptions(() =>
      application!.getAppState().getPasscodeTimingOptions()
    );
  };

  const onScreenshotPrivacyPress = async () => {
    const enable = !hasScreenshotPrivacy;
    setHasScreenshotPrivacy(enable);
    await application?.getAppState().setScreenshotPrivacyEnabled(enable);
  };

  const onPasscodePress = async () => {
    if (props.hasPasscode) {
      disableAuthentication('passcode');
    } else {
      navigation.push(SCREEN_INPUT_MODAL_PASSCODE);
    }
  };

  const onBiometricsPress = async () => {
    if (hasBiometrics) {
      disableAuthentication('biometrics');
    } else {
      setHasBiometrics(true);
      await application?.enableBiometrics();
      await setBiometricsTiming(UnlockTiming.OnQuit);
      props.updateProtectionsAvailable();
    }
  };

  const disableBiometrics = useCallback(async () => {
    if (await application?.disableBiometrics()) {
      setHasBiometrics(false);
      props.updateProtectionsAvailable();
    }
  }, [application, props]);

  const disablePasscode = useCallback(async () => {
    const hasAccount = Boolean(application?.hasAccount());
    let message;
    if (hasAccount) {
      message =
        'Are you sure you want to disable your local passcode? This will not affect your encryption status, as your data is currently being encrypted through your sync account keys.';
    } else {
      message =
        'Are you sure you want to disable your local passcode? This will disable encryption on your data.';
    }

    const confirmed = await application?.alertService?.confirm(
      message,
      'Disable Passcode',
      'Disable Passcode',
      undefined
    );
    if (confirmed) {
      await application?.removePasscode();
    }
  }, [application]);

  const disableAuthentication = useCallback(
    async (authenticationMethod: 'passcode' | 'biometrics') => {
      switch (authenticationMethod) {
        case 'biometrics': {
          disableBiometrics();
          break;
        }
        case 'passcode': {
          disablePasscode();
          break;
        }
      }
    },
    [disableBiometrics, disablePasscode]
  );

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

      <ButtonCell
        leftAligned
        title={screenshotPrivacyTitle}
        onPress={onScreenshotPrivacyPress}
      />

      <ButtonCell leftAligned title={passcodeTitle} onPress={onPasscodePress} />

      <ButtonCell
        last={!hasBiometrics && !props.hasPasscode}
        disabled={!supportsBiometrics}
        leftAligned
        title={biometricTitle}
        onPress={onBiometricsPress}
      />

      {props.hasPasscode && (
        <SectionedOptionsTableCell
          leftAligned
          title={'Require Passcode'}
          options={passcodeTimingOptions}
          onPress={(option: Option) =>
            setPasscodeTiming(option.key as UnlockTiming)
          }
        />
      )}

      {hasBiometrics && (
        <SectionedOptionsTableCell
          leftAligned
          title={'Require Biometrics'}
          options={biometricsTimingOptions}
          onPress={(option: Option) =>
            setBiometricsTiming(option.key as UnlockTiming)
          }
        />
      )}
    </TableSection>
  );
};

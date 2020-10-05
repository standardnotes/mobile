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
import { PRIVILEGES_UNLOCK_PAYLOAD } from '@Screens/Authenticate/AuthenticatePrivileges';
import {
  SCREEN_AUTHENTICATE_PRIVILEGES,
  SCREEN_INPUT_MODAL_PASSCODE,
  SCREEN_SETTINGS,
} from '@Screens/screens';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ProtectedAction, StorageEncryptionPolicies } from 'snjs';
import { Title } from './PasscodeSection.styled';

type Props = {
  title: string;
  hasPasscode: boolean;
  encryptionAvailable: boolean;
};

export const PasscodeSection = (props: Props) => {
  const navigation = useNavigation<
    ModalStackNavigationProp<typeof SCREEN_SETTINGS>['navigation']
  >();
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [encryptionPolicy, setEncryptionPolicy] = useState(() =>
    application?.getStorageEncryptionPolicy()
  );
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricsTimingOptions, setBiometricsTimingOptions] = useState(() =>
    application!.getAppState().getBiometricsTimingOptions()
  );
  const [passcodeTimingOptions, setPasscodeTimingOptions] = useState(() =>
    application!.getAppState().getPasscodeTimingOptions()
  );
  const [supportsBiometrics, setSupportsBiometrics] = useState(false);
  const [
    encryptionPolictChangeInProgress,
    setEncryptionPolictChangeInProgress,
  ] = useState(false);
  const [lockedMethod, setLockedMethod] = useState<'passcode' | 'biometrics'>();

  useEffect(() => {
    let mounted = true;
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

  const passcodeTitle = props.hasPasscode
    ? 'Disable Passcode Lock'
    : 'Enable Passcode Lock';

  const passcodeOnPress = async () => {
    if (props.hasPasscode) {
      disableAuthentication('passcode');
    } else {
      navigation.push(SCREEN_INPUT_MODAL_PASSCODE);
    }
  };

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

  const onBiometricsPress = async () => {
    if (hasBiometrics) {
      disableAuthentication('biometrics');
    } else {
      setHasBiometrics(true);
      await application?.enableBiometrics();
      await setBiometricsTiming(UnlockTiming.OnQuit);
    }
    await application?.getAppState().setScreenshotPrivacy();
  };

  const disableBiometrics = useCallback(async () => {
    setHasBiometrics(false);
    await application?.disableBiometrics();
  }, [application]);

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
      await application?.getAppState().setScreenshotPrivacy();
    }
  }, [application]);

  const disableAuthentication = useCallback(
    async (authenticationMethod: 'passcode' | 'biometrics') => {
      if (
        await application?.privilegesService!.actionRequiresPrivilege(
          ProtectedAction.ManagePasscode
        )
      ) {
        const privilegeCredentials = await application!.privilegesService!.netCredentialsForAction(
          ProtectedAction.ManagePasscode
        );
        setLockedMethod(authenticationMethod);
        navigation.navigate(SCREEN_AUTHENTICATE_PRIVILEGES, {
          action: ProtectedAction.ManagePasscode,
          privilegeCredentials,
          previousScreen: SCREEN_SETTINGS,
        });
      } else {
        if (authenticationMethod === 'biometrics') {
          disableBiometrics();
        } else if (authenticationMethod === 'passcode') {
          disablePasscode();
        }
      }
    },
    [application, disableBiometrics, disablePasscode, navigation]
  );

  /*
   * After screen is focused read if a requested privilage was unlocked
   */
  useFocusEffect(
    useCallback(() => {
      const readPrivilegesUnlockResponse = async () => {
        if (application?.isLaunched() && lockedMethod) {
          const result = await application?.getValue(PRIVILEGES_UNLOCK_PAYLOAD);
          if (
            result &&
            result.previousScreen === SCREEN_SETTINGS &&
            result.unlockedAction === ProtectedAction.ManagePasscode
          ) {
            if (lockedMethod === 'biometrics') {
              disableBiometrics();
            } else if (lockedMethod === 'passcode') {
              disablePasscode();
            }
            setLockedMethod(undefined);
            application?.removeValue(PRIVILEGES_UNLOCK_PAYLOAD);
            application?.removeValue(PRIVILEGES_UNLOCK_PAYLOAD);
          } else {
            setLockedMethod(undefined);
          }
        }
      };

      readPrivilegesUnlockResponse();
    }, [application, disableBiometrics, disablePasscode, lockedMethod])
  );

  let biometricTitle = hasBiometrics
    ? 'Disable Biometrics Lock'
    : 'Enable Biometrics Lock';
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

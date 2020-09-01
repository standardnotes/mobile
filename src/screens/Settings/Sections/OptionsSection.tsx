import { ButtonCell } from '@Components/ButtonCell';
import { SectionedAccessoryTableCell } from '@Components/SectionedAccessoryTableCell';
import { SectionedOptionsTableCell } from '@Components/SectionedOptionsTableCell';
import { SectionHeader } from '@Components/SectionHeader';
import { TableSection } from '@Components/TableSection';
import { useSignedIn } from '@Lib/snjsHooks';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ModalStackNavigationProp } from '@Root/App';
import { ApplicationContext } from '@Root/ApplicationContext';
import { PRIVILEGES_UNLOCK_PAYLOAD } from '@Screens/Authenticate/AuthenticatePrivileges';
import {
  SCREEN_AUTHENTICATE_PRIVILEGES,
  SCREEN_MANAGE_PRIVILEGES,
  SCREEN_SETTINGS,
} from '@Screens/screens';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { ButtonType, ProtectedAction } from 'snjs';

type Props = {
  title: string;
  encryptionAvailable: boolean;
};

export const OptionsSection = ({ title, encryptionAvailable }: Props) => {
  // Context
  const application = useContext(ApplicationContext);
  const signedIn = useSignedIn();
  const navigation = useNavigation<
    ModalStackNavigationProp<typeof SCREEN_SETTINGS>['navigation']
  >();

  // State
  const [exporting, setExporting] = useState(false);
  const [awaitingUnlock, setAwaitingUnlock] = useState(false);
  const [encryptedBackup, setEncryptedBackp] = useState(false);

  const email = useMemo(() => {
    if (signedIn) {
      const user = application?.getUser();
      return user?.email;
    }
  }, [application, signedIn]);

  const exportOptions = useMemo(() => {
    return [
      {
        title: 'Encrypted',
        key: 'encrypted',
        selected: encryptionAvailable,
      },
      { title: 'Decrypted', key: 'decrypted', selected: true },
    ];
  }, [encryptionAvailable]);

  const destroyLocalData = async () => {
    if (
      await application?.alertService?.confirm(
        'Signing out will remove all data from this device, including notes and tags. Make sure your data is synced before proceeding.',
        'Sign Out?',
        'Sign Out',
        ButtonType.Danger
      )
    ) {
      await application!.signOut();
    }
  };

  const openPrivilegeModal = useCallback(
    async (protectedAction: ProtectedAction) => {
      setAwaitingUnlock(true);
      const privilegeCredentials = await application!.privilegesService!.netCredentialsForAction(
        protectedAction
      );
      navigation.navigate(SCREEN_AUTHENTICATE_PRIVILEGES, {
        action: protectedAction,
        privilegeCredentials,
        previousScreen: SCREEN_SETTINGS,
      });
    },
    [application, navigation]
  );

  const exportData = useCallback(
    async (encrypted: boolean) => {
      setExporting(true);
      await application?.getBackupsService().export(encrypted);
      setExporting(false);
    },
    [application]
  );

  const onExportPress = useCallback(
    async (option: { key: string }) => {
      let encrypted = option.key === 'encrypted';
      if (encrypted && !encryptionAvailable) {
        application?.alertService!.alert(
          'You must be signed in, or have a local passcode set, to generate an encrypted export file.',
          'Not Available',
          'OK'
        );
        return;
      }
      if (
        await application?.privilegesService!.actionRequiresPrivilege(
          ProtectedAction.ManageBackups
        )
      ) {
        setEncryptedBackp(encrypted);
        await openPrivilegeModal(ProtectedAction.ManageBackups);
      } else {
        exportData(encrypted);
      }
    },
    [
      application?.alertService,
      application?.privilegesService,
      encryptionAvailable,
      exportData,
      openPrivilegeModal,
    ]
  );

  const openManagePrivileges = useCallback(() => {
    navigation.push(SCREEN_MANAGE_PRIVILEGES);
  }, [navigation]);

  const onManagePrivilegesPress = useCallback(async () => {
    if (
      await application?.privilegesService!.actionRequiresPrivilege(
        ProtectedAction.ManagePrivileges
      )
    ) {
      await openPrivilegeModal(ProtectedAction.ManagePrivileges);
    } else {
      openManagePrivileges();
    }
  }, [
    application?.privilegesService,
    openManagePrivileges,
    openPrivilegeModal,
  ]);

  /*
   * After screen is focused read if a requested privilage was unlocked
   */
  useFocusEffect(
    useCallback(() => {
      const readPrivilegesUnlockResponse = async () => {
        if (application?.isLaunched() && awaitingUnlock) {
          const result = await application?.getValue(PRIVILEGES_UNLOCK_PAYLOAD);
          if (result && result.previousScreen === SCREEN_SETTINGS) {
            setAwaitingUnlock(false);
            if (result.unlockedAction === ProtectedAction.ManagePrivileges) {
              openManagePrivileges();
            } else if (
              result.unlockedAction === ProtectedAction.ManageBackups
            ) {
              exportData(encryptedBackup);
              setEncryptedBackp(false);
            }
            application?.removeValue(PRIVILEGES_UNLOCK_PAYLOAD);
          } else {
            setAwaitingUnlock(false);
          }
        }
      };

      readPrivilegesUnlockResponse();
    }, [
      application,
      awaitingUnlock,
      encryptedBackup,
      exportData,
      openManagePrivileges,
    ])
  );

  return (
    <TableSection>
      <SectionHeader title={title} />

      <ButtonCell
        first={true}
        leftAligned={true}
        title={'Manage Privileges'}
        onPress={onManagePrivilegesPress}
      />

      {signedIn && (
        <ButtonCell
          testID="signOutButton"
          leftAligned={true}
          title={`Sign out (${email})`}
          onPress={destroyLocalData}
        />
      )}
      <SectionedOptionsTableCell
        testID="exportData"
        first={false}
        leftAligned
        options={exportOptions}
        title={exporting ? 'Processing...' : 'Export Data'}
        onPress={onExportPress}
      />

      {!signedIn && (
        <SectionedAccessoryTableCell
          testID="lastExportDate"
          onPress={() => {
            // TODO:
            Alert.alert('TODO', 'Not implemented yet');
          }}
          tinted={true}
          text={'Your data has not yet been backed up.'}
        />
      )}
    </TableSection>
  );
};

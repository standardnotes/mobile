import { ButtonCell } from '@Components/ButtonCell';
import { SectionedAccessoryTableCell } from '@Components/SectionedAccessoryTableCell';
import { SectionedOptionsTableCell } from '@Components/SectionedOptionsTableCell';
import { SectionHeader } from '@Components/SectionHeader';
import { TableSection } from '@Components/TableSection';
import { PrefKey } from '@Lib/preferences_manager';
import { useSignedIn } from '@Lib/snjs_helper_hooks';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ModalStackNavigationProp } from '@Root/ModalStack';
import { PRIVILEGES_UNLOCK_PAYLOAD } from '@Screens/Authenticate/AuthenticatePrivileges';
import {
  SCREEN_AUTHENTICATE_PRIVILEGES,
  SCREEN_MANAGE_PRIVILEGES,
  SCREEN_SETTINGS,
} from '@Screens/screens';
import { ButtonType, ProtectedAction } from '@standardnotes/snjs';
import moment from 'moment';
import React, { useCallback, useContext, useMemo, useState } from 'react';

type Props = {
  title: string;
  encryptionAvailable: boolean;
};

export const OptionsSection = ({ title, encryptionAvailable }: Props) => {
  // Context
  const application = useContext(ApplicationContext);
  const [signedIn] = useSignedIn();
  const navigation = useNavigation<
    ModalStackNavigationProp<typeof SCREEN_SETTINGS>['navigation']
  >();

  // State
  const [exporting, setExporting] = useState(false);
  const [awaitingUnlock, setAwaitingUnlock] = useState(false);
  const [encryptedBackup, setEncryptedBackp] = useState(false);
  const [lastExportDate, setLastExportDate] = useState<Date | undefined>(() =>
    application?.getPrefsService().getValue(PrefKey.LastExportDate, undefined)
  );

  const lastExportData = useMemo(() => {
    if (lastExportDate) {
      let formattedDate = moment(lastExportDate).format('lll');
      const lastExportString = `Last exported on ${formattedDate}`;

      // Date is stale if more than 7 days ago
      let staleThreshold = 7 * 86400;
      // @ts-ignore date type issue
      const stale =
        // @ts-ignore date type issue
        (new Date() - new Date(lastExportDate)) / 1000 > staleThreshold;
      return {
        lastExportString,
        stale,
      };
    }
    return {
      lastExportString: 'Your data has not yet been backed up.',
      stale: false,
    };
  }, [lastExportDate]);

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
      const result = await application?.getBackupsService().export(encrypted);
      if (result) {
        const exportDate = new Date();
        setLastExportDate(exportDate);
        application
          ?.getPrefsService()
          .setUserPrefValue(PrefKey.LastExportDate, exportDate);
      }
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

  const showDataBackupAlert = useCallback(() => {
    application?.alertService.alert(
      'Because you are using the app offline without a sync account, it is your responsibility to keep your data safe and backed up. It is recommended you export a backup of your data at least once a week, or, to sign up for a sync account so that your data is backed up automatically.',
      'No Backups Created',
      'OK'
    );
  }, [application?.alertService]);

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
            (!lastExportDate || lastExportData.stale) && showDataBackupAlert();
          }}
          tinted={!lastExportDate || lastExportData.stale}
          text={lastExportData.lastExportString}
        />
      )}
    </TableSection>
  );
};

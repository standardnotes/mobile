import { ButtonCell } from '@Components/ButtonCell';
import { SectionedAccessoryTableCell } from '@Components/SectionedAccessoryTableCell';
import { SectionedOptionsTableCell } from '@Components/SectionedOptionsTableCell';
import { SectionHeader } from '@Components/SectionHeader';
import { TableSection } from '@Components/TableSection';
import { PrefKey } from '@Lib/preferences_manager';
import { useSignedIn } from '@Lib/snjs_helper_hooks';
import { useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ModalStackNavigationProp } from '@Root/ModalStack';
import { SCREEN_MANAGE_SESSIONS, SCREEN_SETTINGS } from '@Screens/screens';
import { ButtonType } from '@standardnotes/snjs';
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
      exportData(encrypted);
    },
    [application?.alertService, encryptionAvailable, exportData]
  );

  const openManageSessions = useCallback(() => {
    navigation.push(SCREEN_MANAGE_SESSIONS);
  }, [navigation]);

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

      {signedIn && (
        <>
          <ButtonCell
            testID="manageSessionsButton"
            leftAligned={true}
            first={true}
            title={'Manage Sessions'}
            onPress={openManageSessions}
          />
          <ButtonCell
            testID="signOutButton"
            leftAligned={true}
            first={false}
            title={`Sign out (${email})`}
            onPress={destroyLocalData}
          />
        </>
      )}

      <SectionedOptionsTableCell
        testID="exportData"
        first={!signedIn}
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

import { ButtonCell } from '@Components/ButtonCell';
import { SectionedAccessoryTableCell } from '@Components/SectionedAccessoryTableCell';
import { SectionedOptionsTableCell } from '@Components/SectionedOptionsTableCell';
import { SectionHeader } from '@Components/SectionHeader';
import { TableSection } from '@Components/TableSection';
import { useSignedIn } from '@Lib/snjsHooks';
import { ApplicationContext } from '@Root/ApplicationContext';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { ButtonType } from 'snjs';

type Props = {
  title: string;
  encryptionAvailable: boolean;
};

export const OptionsSection = ({ title, encryptionAvailable }: Props) => {
  // Context
  const application = useContext(ApplicationContext);
  const signedIn = useSignedIn();

  // State
  const [exporting, setExporting] = useState(false);

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

      setExporting(true);

      await application?.getBackupsService().export(encrypted);

      setExporting(false);
    },
    [application, encryptionAvailable]
  );

  return (
    <TableSection>
      <SectionHeader title={title} />

      <ButtonCell
        first={true}
        leftAligned={true}
        title={'Manage Privileges'}
        onPress={() => {
          Alert.alert('TODO', 'Not implemented yet');
        }}
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

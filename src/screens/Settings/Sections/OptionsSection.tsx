import React from 'react';
import { Alert } from 'react-native';
import { withNavigation } from 'react-navigation';
import ButtonCell from '@Components/ButtonCell';
import SectionHeader from '@Components/SectionHeader';
import SectionedAccessoryTableCell from '@Components/SectionedAccessoryTableCell';
import SectionedOptionsTableCell from '@Components/SectionedOptionsTableCell';
import TableSection from '@Components/TableSection';
import BackupsManager from '@Lib/BackupsManager';
import KeysManager from '@Lib/keysManager';
import moment from '@Lib/moment';
import UserPrefsManager, { LAST_EXPORT_DATE_KEY } from '@Lib/userPrefsManager';
import Auth from '@Lib/snjs/authManager';
import Abstract from '@Screens/Abstract';

import { SFPrivilegesManager } from 'snjs';

class OptionsSection extends Abstract {
  constructor(props) {
    super(props);
    let encryptionAvailable = KeysManager.get().activeKeys() != null;
    let email = KeysManager.get().getUserEmail();
    let isOffline = Auth.get().offline();
    this.state = {
      loadingExport: false,
      encryptionAvailable: encryptionAvailable,
      email: email,
      signedIn: !isOffline,
    };
  }

  componentDidMount() {
    super.componentDidMount();
    UserPrefsManager.get()
      .getPrefAsDate({ key: LAST_EXPORT_DATE_KEY })
      .then(date => {
        this.setState({ lastExportDate: date });
      });
  }

  onExportPress = option => {
    let encrypted = option.key === 'encrypted';
    if (encrypted && !this.state.encryptionAvailable) {
      Alert.alert(
        'Not Available',
        'You must be signed in, or have a local passcode set, to generate an encrypted export file.',
        [{ text: 'OK' }]
      );
      return;
    }

    this.setState({ loadingExport: true });

    this.handlePrivilegedAction(
      true,
      SFPrivilegesManager.ActionManageBackups,
      async () => {
        BackupsManager.get()
          .export(encrypted)
          .then(success => {
            if (success) {
              const date = new Date();
              this.setState({ lastExportDate: date });
              UserPrefsManager.get().setPref({
                key: LAST_EXPORT_DATE_KEY,
                value: date,
              });
            }
            this.setState({ loadingExport: false });
          })
          .catch(error => {
            this.setState({ loadingExport: false });
          });
      },
      () => {
        this.setState({ loadingExport: false });
      }
    );
  };

  exportOptions = () => {
    return [
      {
        title: 'Encrypted',
        key: 'encrypted',
        selected: this.state.encryptionAvailable,
      },
      { title: 'Decrypted', key: 'decrypted', selected: true },
    ];
  };

  showDataBackupAlert = () => {
    Alert.alert(
      'No Backups Created',
      'Because you are using the app offline without a sync account, it is your responsibility to keep your data safe and backed up. It is recommended you export a backup of your data at least once a week, or, to sign up for a sync account so that your data is backed up automatically.',
      [{ text: 'OK' }]
    );
  };

  onSignOutPress = () => {
    this.props.onSignOutPress().then(() => {
      this.setState({ signedIn: false });
    });
  };

  render() {
    let lastExportString, stale;
    if (this.state.lastExportDate) {
      let formattedDate = moment(this.state.lastExportDate).format('lll');
      lastExportString = `Last exported on ${formattedDate}`;

      // Date is stale if more than 7 days ago
      let staleThreshold = 7 * 86400;
      stale = (new Date() - this.state.lastExportDate) / 1000 > staleThreshold;
    } else {
      lastExportString = 'Your data has not yet been backed up.';
    }

    const signedIn = this.state.signedIn;
    const hasLastExportSection = !signedIn;

    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        <ButtonCell
          first={true}
          leftAligned={true}
          title={'Manage Privileges'}
          onPress={this.props.onManagePrivileges}
        />

        {signedIn && (
          <ButtonCell
            testID="signOutButton"
            leftAligned={true}
            title={`Sign out (${this.state.email})`}
            onPress={this.onSignOutPress}
          />
        )}

        <SectionedOptionsTableCell
          testID="exportData"
          last={!hasLastExportSection}
          first={false}
          disabled={this.state.loadingExport}
          leftAligned={true}
          options={this.exportOptions()}
          title={this.state.loadingExport ? 'Processing...' : 'Export Data'}
          onPress={this.onExportPress}
        />

        {hasLastExportSection && (
          <SectionedAccessoryTableCell
            testID="lastExportDate"
            last={true}
            onPress={() => {
              (!this.state.lastExportDate || stale) &&
                this.showDataBackupAlert();
            }}
            tinted={!this.state.lastExportDate || stale}
            text={lastExportString}
          />
        )}
      </TableSection>
    );
  }
}

export default withNavigation(OptionsSection);

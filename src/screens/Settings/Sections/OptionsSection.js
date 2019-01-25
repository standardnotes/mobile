import React, { Component } from 'react';
import {Alert} from 'react-native';
import StyleKit from "@Style/StyleKit"
import {TextInput, View, Text} from 'react-native';
import UserPrefsManager from "@Lib/userPrefsManager"
import KeysManager from "@Lib/keysManager"
import Auth from '@SFJS/authManager'
import SectionHeader from "@Components/SectionHeader";
import ButtonCell from "@Components/ButtonCell";
import TableSection from "@Components/TableSection";
import SectionedTableCell from "@Components/SectionedTableCell";
import SectionedAccessoryTableCell from "@Components/SectionedAccessoryTableCell";
import SectionedOptionsTableCell from "@Components/SectionedOptionsTableCell";
import { withNavigation } from 'react-navigation';
import Abstract from "@Screens/Abstract";
import BackupsManager from "@Lib/BackupsManager"

import moment from "@Lib/moment"

class OptionsSection extends Abstract {

  constructor(props) {
    super(props);
    let encryptionAvailable = KeysManager.get().activeKeys() != null;
    let email = KeysManager.get().getUserEmail();
    this.state = {
      loadingExport: false,
      encryptionAvailable: encryptionAvailable,
      email: email
    };
  }

  componentDidMount() {
    super.componentDidMount();
    UserPrefsManager.get().getLastExportDate().then((date) => {
      this.setState({lastExportDate: date});
    })
  }

  onExportPress = (option) => {
    let encrypted = option.key == "encrypted";
    if(encrypted && !this.state.encryptionAvailable) {
      Alert.alert('Not Available', "You must be signed in, or have a local passcode set, to generate an encrypted export file.", [{text: 'OK'}])
      return;
    }

    this.setState({loadingExport: true});

    this.handlePrivilegedAction(true, SFPrivilegesManager.ActionManageBackups, async () => {
      BackupsManager.get().export(encrypted).then((success) => {
        if(success) {
          var date = new Date();
          this.setState({lastExportDate: date});
          UserPrefsManager.get().setLastExportDate(date);
        }
        this.setState({loadingExport: false});
      })
    }, () => {
      this.setState({loadingExport: false});
    });
  }

  exportOptions = () => {
    return [
      {title: "Encrypted", key: "encrypted", selected: this.state.encryptionAvailable},
      {title: "Decrypted", key: "decrypted", selected: true}
    ];
  }

  showDataBackupAlert = () => {
    Alert.alert(
      'No Backups Created',
      "Because you are using the app offline without a sync account, it is your responsibility to keep your data safe and backed up. It is recommended you export a backup of your data at least once a week, or, to sign up for a sync account so that your data is backed up automatically.",
      [{text: 'OK'}]
    )
  }

  render() {
    var lastExportString, stale;
    if(this.props.lastExportDate) {
      var formattedDate = moment(this.props.lastExportDate).format('lll');
      lastExportString = `Last exported on ${formattedDate}`;

      // Date is stale if more than 7 days ago
      let staleThreshold = 7 * 86400;
      stale = ((new Date() - this.props.lastExportDate) / 1000) > staleThreshold;
    } else {
      lastExportString = "Your data has not yet been backed up.";
    }

    let signedIn = !Auth.get().offline();

    var hasLastExportSection = !signedIn;

    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        <ButtonCell first={true} leftAligned={true} title={`Manage Privileges`} onPress={this.props.onManagePrivileges} />

        {signedIn &&
          <ButtonCell leftAligned={true} title={`Sign out (${this.state.email})`} onPress={this.props.onSignOutPress} />
        }

        <SectionedOptionsTableCell
          last={!hasLastExportSection}
          first={false}
          disabled={this.state.loadingExport}
          leftAligned={true}
          options={this.exportOptions()}
          title={this.state.loadingExport ? "Processing..." : "Export Data"}
          onPress={this.onExportPress}
        />

        {hasLastExportSection &&
          <SectionedAccessoryTableCell
            last={true}
            onPress={() => {(!this.props.lastExportDate || stale) && this.showDataBackupAlert()}}
            tinted={!this.props.lastExportDate || stale}
            text={lastExportString}
          />
        }


      </TableSection>
    );
  }
}

export default withNavigation(OptionsSection);

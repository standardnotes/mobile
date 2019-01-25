import React, { Component } from 'react';
import { TextInput, View, Text, Platform, SafeAreaView, ScrollView } from 'react-native';
import StyleKit from "@Style/StyleKit"
import TableSection from "@Components/TableSection";
import SectionedTableCell from "@Components/SectionedTableCell";
import SectionedOptionsTableCell from "@Components/SectionedOptionsTableCell";
import SectionedAccessoryTableCell from "@Components/SectionedAccessoryTableCell"
import SectionHeader from "@Components/SectionHeader";
import ButtonCell from "@Components/ButtonCell";
import Abstract from "@Screens/Abstract"
import LockedView from "@Containers/LockedView";
import ApplicationState from "@Lib/ApplicationState"
import Auth from "@SFJS/authManager"
import KeysManager from "@Lib/keysManager"
import PrivilegesManager from "@SFJS/privilegesManager"

export default class ManagePrivileges extends Abstract {

  static navigationOptions = ({ navigation, navigationOptions }) => {
    let templateOptions = {
      title: "Privileges",
      leftButton: {
        title: ApplicationState.isIOS ? "Done" : null,
        iconName: ApplicationState.isIOS ? null : StyleKit.nameForIcon("checkmark"),
      }
    }
    return Abstract.getDefaultNavigationOptions({navigation, navigationOptions, templateOptions});
  };

  constructor(props) {
    super(props);

    this.state = {
      availableActions: [],
      availableCredentials: []
    }

    props.navigation.setParams({
      leftButton: {
        title: ApplicationState.isIOS ? "Done" : null,
        iconName: ApplicationState.isIOS ? null : StyleKit.nameForIcon("checkmark"),
        onPress: () => {
          this.dismiss();
        }
      }
    })

    this.hasPasscode = KeysManager.get().hasOfflinePasscode();
    this.hasAccount = !Auth.get().offline();

    this.reloadPrivileges();
  }

  displayInfoForCredential(credential) {
    return PrivilegesManager.get().displayInfoForCredential(credential).label;
  }

  displayInfoForAction(action) {
    return PrivilegesManager.get().displayInfoForAction(action).label;
  }

  isCredentialRequiredForAction(action, credential) {
    if(!this.privileges) {
      return false;
    }
    return this.privileges.isCredentialRequiredForAction(action, credential);
  }

  clearSession = () => {
    PrivilegesManager.get().clearSession().then(() => {
      this.reloadPrivileges();
    })
  }

  async reloadPrivileges() {
    this.privileges = await PrivilegesManager.get().getPrivileges();
    let availableCredentials = PrivilegesManager.get().getAvailableCredentials();
    let availableActions = PrivilegesManager.get().getAvailableActions();

    let notConfiguredCredentials = [];
    let hasLocalAuth = KeysManager.get().hasOfflinePasscode() || KeysManager.get().hasFingerprint();
    let offline = Auth.get().offline();
    for(let credential of availableCredentials) {
      if(credential == PrivilegesManager.CredentialLocalPasscode && !hasLocalAuth) {
        notConfiguredCredentials.push(credential);
      } else if(credential == PrivilegesManager.CredentialAccountPassword && offline) {
        notConfiguredCredentials.push(credential);
      }
    }

    this.credentialDisplayInfo = {};
    for(let cred of availableCredentials) {
      this.credentialDisplayInfo[cred] = this.displayInfoForCredential(cred);
    }

    let sessionEndDate = await PrivilegesManager.get().getSessionExpirey();
    this.setState({
      availableActions: availableActions,
      availableCredentials: availableCredentials,
      notConfiguredCredentials: notConfiguredCredentials,
      sessionExpirey: sessionEndDate.toLocaleString(),
      sessionExpired: new Date() >= sessionEndDate
    });
  }

  valueChanged(action, credential) {
    this.privileges.toggleCredentialForAction(action, credential);
    PrivilegesManager.get().savePrivileges();
    this.forceUpdate();
  }

  credentialUnavailable = (credential) => {
    return this.state.notConfiguredCredentials.includes(credential);
  }

  render() {
    if(this.state.lockContent) {
      return (<LockedView />);
    }

    return (
      <View style={[StyleKit.styles.container, StyleKit.styles.baseBackground]}>
        <ScrollView>

          <View style={this.styles.section}>
            <SectionHeader title={"About Privileges"} />
            <SectionedTableCell first={true} last={true}>
              <Text style={[this.styles.aboutText, this.styles.cellText]}>
                Privileges represent interface level authentication for accessing certain items and features. Privileges are meant to protect against unwanted access in the event of an unlocked application, but do not affect data encryption state.
              </Text>
              <Text style={[this.styles.aboutText, this.styles.cellText]}>
                Privileges sync across your other devices—however, note that if you require a "Local Passcode" privilege, and another device does not have a local passcode set up, the local passcode requirement will be ignored on that device.
              </Text>
            </SectionedTableCell>
          </View>

          {this.state.sessionExpirey && !this.state.sessionExpired &&
            <View style={this.styles.section}>
              <SectionHeader title={"Current Session"} />
              <SectionedTableCell first={true}>
                <Text style={[this.styles.cellText]}>
                  You will not be asked to authenticate until {this.state.sessionExpirey}.
                </Text>
              </SectionedTableCell>
              <ButtonCell last={true} leftAligned={true} title={`Clear Local Session`} onPress={this.clearSession} />
            </View>
          }

          {this.state.availableActions.map((action, actionIndex) =>
            <View style={this.styles.section} key={`${actionIndex}`}>
              <SectionHeader title={this.displayInfoForAction(action)} />
              {this.state.availableCredentials.map((credential, credIndex) =>
                <SectionedAccessoryTableCell
                  text={this.displayInfoForCredential(credential) + (this.credentialUnavailable(credential) ? ' (Not Configured)' : '')}
                  key={`${actionIndex}+${credIndex}`}
                  first={credIndex == 0}
                  disabled={this.credentialUnavailable(credential)}
                  dimmed={this.credentialUnavailable(credential)}
                  last={credIndex == this.state.availableCredentials.length - 1}
                  selected={() => {return this.isCredentialRequiredForAction(action, credential)}}
                  onPress={() => {this.valueChanged(action, credential)}}
                />
              )}
            </View>
          )}

        </ScrollView>
      </View>
    );
  }

  loadStyles() {
    this.styles = {
      section: {
        marginBottom: 8
      },
      cellText: {
        lineHeight: 19,
        fontSize: 16,
        color: StyleKit.variables.stylekitForegroundColor,
      },
      aboutText: {
        marginBottom: 8
      }
    }
  }

}

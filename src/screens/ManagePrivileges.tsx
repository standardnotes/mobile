import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-navigation';
import ButtonCell from '@Components/ButtonCell';
import SectionHeader from '@Components/SectionHeader';
import SectionedAccessoryTableCell from '@Components/SectionedAccessoryTableCell';
import SectionedTableCell from '@Components/SectionedTableCell';
import LockedView from '@Containers/LockedView';
import { ApplicationState } from '@Lib/ApplicationState';
import Abstract, { AbstractState, AbstractProps } from '@Screens/Abstract';
import { ICON_CHECKMARK } from '@Style/icons';
import StyleKit from '@Style/StyleKit';

type State = {
  availableActions: any[];
  availableCredentials: any[];
  notConfiguredCredentials?: any[];
  sessionExpirey?: string;
  sessionExpired?: boolean;
} & AbstractState;

export default class ManagePrivileges extends Abstract<AbstractProps, State> {
  static navigationOptions = ({ navigation, navigationOptions }: any) => {
    const templateOptions = {
      title: 'Privileges',
      leftButton: {
        title: ApplicationState.isIOS ? 'Done' : null,
        iconName: ApplicationState.isIOS
          ? null
          : StyleKit.nameForIcon(ICON_CHECKMARK),
      },
    };
    return Abstract.getDefaultNavigationOptions({
      navigation,
      _navigationOptions: navigationOptions,
      templateOptions,
    });
  };
  hasPasscode: boolean;
  hasAccount: boolean;
  privileges: any;
  credentialDisplayInfo: Record<string, string> = {};
  styles: any;

  constructor(props: Readonly<AbstractProps>) {
    super(props);

    this.state = {
      availableActions: [],
      availableCredentials: [],
    };

    props.navigation.setParams({
      leftButton: {
        title: ApplicationState.isIOS ? 'Done' : null,
        iconName: ApplicationState.isIOS
          ? null
          : StyleKit.nameForIcon(ICON_CHECKMARK),
        onPress: () => {
          this.dismiss();
        },
      },
    });

    this.hasPasscode = KeysManager.get().hasOfflinePasscode();
    this.hasAccount = !Auth.get().offline();

    this.reloadPrivileges();
  }

  displayInfoForCredential(credential: any) {
    return PrivilegesManager.get().displayInfoForCredential(credential).label;
  }

  displayInfoForAction(action: any) {
    return PrivilegesManager.get().displayInfoForAction(action).label;
  }

  isCredentialRequiredForAction(action: any, credential: any) {
    if (!this.privileges) {
      return false;
    }
    return this.privileges.isCredentialRequiredForAction(action, credential);
  }

  clearSession = () => {
    PrivilegesManager.get()
      .clearSession()
      .then(() => {
        this.reloadPrivileges();
      });
  };

  async reloadPrivileges() {
    this.privileges = await PrivilegesManager.get().getPrivileges();
    const availableCredentials = PrivilegesManager.get().getAvailableCredentials();
    const availableActions = PrivilegesManager.get().getAvailableActions();

    const notConfiguredCredentials = [];
    const hasLocalAuth =
      KeysManager.get().hasOfflinePasscode() ||
      KeysManager.get().hasBiometrics();
    const offline = Auth.get().offline();
    for (const credential of availableCredentials) {
      if (
        credential === PrivilegesManager.CredentialLocalPasscode &&
        !hasLocalAuth
      ) {
        notConfiguredCredentials.push(credential);
      } else if (
        credential === PrivilegesManager.CredentialAccountPassword &&
        offline
      ) {
        notConfiguredCredentials.push(credential);
      }
    }

    this.credentialDisplayInfo = {};
    for (const cred of availableCredentials) {
      this.credentialDisplayInfo[cred] = this.displayInfoForCredential(cred);
    }

    const sessionEndDate = await PrivilegesManager.get().getSessionExpirey();
    this.setState({
      availableActions: availableActions,
      availableCredentials: availableCredentials,
      notConfiguredCredentials: notConfiguredCredentials,
      sessionExpirey: sessionEndDate.toLocaleString(),
      sessionExpired: new Date() >= sessionEndDate,
    });
  }

  valueChanged(action: any, credential: any) {
    this.privileges.toggleCredentialForAction(action, credential);
    PrivilegesManager.get().savePrivileges();
    this.forceUpdate();
  }

  credentialUnavailable = (credential: any) => {
    return this.state.notConfiguredCredentials?.includes(credential);
  };

  render() {
    if (this.state.lockContent) {
      return <LockedView />;
    }

    return (
      <SafeAreaView
        style={[StyleKit.styles.container, StyleKit.styles.baseBackground]}
      >
        <ScrollView>
          <View style={this.styles.section}>
            <SectionHeader title={'About Privileges'} />
            <SectionedTableCell first={true} last={true}>
              <Text style={[this.styles.aboutText, this.styles.cellText]}>
                Privileges represent interface level authentication for
                accessing certain items and features. Privileges are meant to
                protect against unwanted access in the event of an unlocked
                application, but do not affect data encryption state.
              </Text>
              <Text style={[this.styles.aboutText, this.styles.cellText]}>
                Privileges sync across your other devices—however, note that if
                you require a "Local Passcode" privilege, and another device
                does not have a local passcode set up, the local passcode
                requirement will be ignored on that device.
              </Text>
            </SectionedTableCell>
          </View>

          {this.state.sessionExpirey && !this.state.sessionExpired && (
            <View style={this.styles.section}>
              <SectionHeader title={'Current Session'} />
              <SectionedTableCell first={true}>
                <Text style={[this.styles.cellText]}>
                  You will not be asked to authenticate until{' '}
                  {this.state.sessionExpirey}.
                </Text>
              </SectionedTableCell>
              <ButtonCell
                last={true}
                leftAligned={true}
                title={'Clear Local Session'}
                onPress={this.clearSession}
              />
            </View>
          )}

          {this.state.availableActions.map((action, actionIndex) => (
            <View style={this.styles.section} key={`${actionIndex}`}>
              <SectionHeader title={this.displayInfoForAction(action)} />
              {this.state.availableCredentials.map((credential, credIndex) => (
                <SectionedAccessoryTableCell
                  text={
                    this.displayInfoForCredential(credential) +
                    (this.credentialUnavailable(credential)
                      ? ' (Not Configured)'
                      : '')
                  }
                  key={`${actionIndex}+${credIndex}`}
                  first={credIndex === 0}
                  disabled={this.credentialUnavailable(credential)}
                  dimmed={this.credentialUnavailable(credential)}
                  last={
                    credIndex === this.state.availableCredentials.length - 1
                  }
                  selected={() => {
                    return this.isCredentialRequiredForAction(
                      action,
                      credential
                    );
                  }}
                  onPress={() => {
                    this.valueChanged(action, credential);
                  }}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  loadStyles() {
    this.styles = {
      section: {
        marginBottom: 8,
      },
      cellText: {
        lineHeight: 19,
        fontSize: 16,
        color: StyleKit.variables.stylekitForegroundColor,
      },
      aboutText: {
        marginBottom: 8,
      },
    };
  }
}

import { SectionedTableCell } from '@Components/SectionedTableCell';
import { SectionHeader } from '@Components/SectionHeader';
import { TableSection } from '@Components/TableSection';
import { ApplicationContext } from '@Root/ApplicationContext';
import React, { Component } from 'react';
import { Text, View } from 'react-native';

type Props = {
  title: string;
};

type State = {
  items: any[];
};

export default class PasscodeSection extends Component<Props, State> {
  static contextType = ApplicationContext;
  context!: React.ContextType<typeof ApplicationContext>;
  constructor(props: Readonly<Props>) {
    super(props);

    this.state = {
      items: ModelManager.get().allItemsMatchingTypes(['Note', 'Tag']),
    };
  }

  render() {
    const source = KeysManager.get().encryptionSource();
    let enabled = source !== null;
    if (source === 'offline') {
      enabled = KeysManager.get().isStorageEncryptionEnabled();
    }
    const encryptionType = 'AES-256';
    const storageEncryptionAvailable = source != null;
    let encryptionStatus = enabled ? 'Enabled' : 'Not Enabled';
    if (enabled) {
      encryptionStatus += ` | ${encryptionType}`;
    } else {
      encryptionStatus += '. '; // to connect sentence
      encryptionStatus += storageEncryptionAvailable
        ? 'To enable encryption, sign in, register, or enable storage encryption.'
        : 'Sign in, register, or add a local passcode to enable encryption.';
    }
    const sourceString = source === 'account' ? 'Account Keys' : 'Passcode';

    const items = this.state.items;
    const itemsStatus =
      items.length + '/' + items.length + ' notes and tags encrypted';

    const titleStyles = {
      color: this.context?.getThemeService().variables.stylekitForegroundColor,
      fontSize: 16,
      fontWeight: 'bold' as 'bold',
    };

    const subtitleStyles = {
      color: this.context?.getThemeService().variables.stylekitNeutralColor,
      fontSize: 14,
      marginTop: 4,
    };

    const containerStyles = {};

    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        <SectionedTableCell last={!enabled} first={true}>
          <View style={containerStyles}>
            <Text style={titleStyles}>Encryption</Text>
            <Text style={subtitleStyles}>{encryptionStatus}</Text>
          </View>
        </SectionedTableCell>

        {enabled && (
          <SectionedTableCell>
            <View style={containerStyles}>
              <Text style={titleStyles}>Encryption Source</Text>
              <Text style={subtitleStyles}>{sourceString}</Text>
            </View>
          </SectionedTableCell>
        )}

        {enabled && (
          <SectionedTableCell last={true}>
            <View style={containerStyles}>
              <Text style={titleStyles}>Items Encrypted</Text>
              <Text style={subtitleStyles}>{itemsStatus}</Text>
            </View>
          </SectionedTableCell>
        )}
      </TableSection>
    );
  }
}

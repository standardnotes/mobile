import React, { Component } from 'react';
import StyleKit from "@Style/StyleKit"
import {Text, View} from 'react-native';
import KeysManager from "@Lib/keysManager"
import ModelManager from "@Lib/sfjs/modelManager"

import SectionHeader from "@Components/SectionHeader";
import ButtonCell from "@Components/ButtonCell";
import TableSection from "@Components/TableSection";
import SectionedTableCell from "@Components/SectionedTableCell";
import SectionedAccessoryTableCell from "@Components/SectionedAccessoryTableCell";

export default class PasscodeSection extends Component {

  constructor(props) {
    super(props);

    this.state = {
      items: ModelManager.get().allItemsMatchingTypes(["Note", "Tag"])
    }
  }

  render() {
    var source = KeysManager.get().encryptionSource();
    var enabled = source !== null;
    if(source == "offline") {
      enabled = KeysManager.get().isStorageEncryptionEnabled();
    }
    var encryptionType = "AES-256";
    var storageEncryptionAvailable = source != null;
    var encryptionStatus = enabled ? "Enabled" : "Not Enabled";
    if(enabled) {
      encryptionStatus += ` | ${encryptionType}`
    } else {
      encryptionStatus += ". "; // to connect sentence
      encryptionStatus += storageEncryptionAvailable
        ? "To enable encryption, sign in, register, or enable storage encryption."
        : "Sign in, register, or add a local passcode to enable encryption."
    }
    var sourceString = source == "account" ? "Account Keys" : "Passcode";

    var items = this.state.items;
    var itemsStatus = items.length + "/" + items.length + " notes and tags encrypted";

    let titleStyles = {
      color: StyleKit.variable("stylekitForegroundColor"),
      fontSize: 16,
      fontWeight: "bold"
    }

    let subtitleStyles = {
      color: StyleKit.variable("stylekitNeutralColor"),
      fontSize: 14,
      marginTop: 4,
    }

    let containerStyles = {}

    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        <SectionedTableCell last={!enabled} first={true}>
          <View style={containerStyles}>
            <Text style={titleStyles}>Encryption</Text>
            <Text style={subtitleStyles}>{encryptionStatus}</Text>
          </View>
        </SectionedTableCell>

        {enabled &&
          <SectionedTableCell>
            <View style={containerStyles}>
              <Text style={titleStyles}>Encryption Source</Text>
              <Text style={subtitleStyles}>{sourceString}</Text>
            </View>
          </SectionedTableCell>
        }

        {enabled &&
          <SectionedTableCell last={true}>
            <View style={containerStyles}>
              <Text style={titleStyles}>Items Encrypted</Text>
              <Text style={subtitleStyles}>{itemsStatus}</Text>
            </View>
          </SectionedTableCell>
        }

      </TableSection>
    );
  }
}

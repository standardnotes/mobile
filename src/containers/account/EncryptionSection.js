import React, { Component } from 'react';
import GlobalStyles from "../../Styles"
import {Text, View} from 'react-native';
import KeysManager from "../../lib/keysManager"
import ModelManager from "../../lib/modelManager"

import SectionHeader from "../../components/SectionHeader";
import ButtonCell from "../../components/ButtonCell";
import TableSection from "../../components/TableSection";
import SectionedTableCell from "../../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../../components/SectionedAccessoryTableCell";

export default class PasscodeSection extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    var source = KeysManager.get().encryptionSource();
    var enabled = source !== null;
    var encryptionStatus = enabled ? "Enabled" : "Not Enabled";
    var sourceString = source == "account" ? "Account Keys" : "Passcode";
    var encryptionType = "AES-256";

    var items = ModelManager.getInstance().allItemsMatchingTypes(["Note", "Tag"]);
    var itemsStatus = items.length + "/" + items.length + " notes and tags encrypted";

    var textStyles = {
      color: GlobalStyles.constants().mainTextColor,
      fontSize: GlobalStyles.constants().mainTextFontSize,
      lineHeight: 22
    }

    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        <SectionedTableCell first={true}>
          <Text style={textStyles}>
            <Text style={{fontWeight: "bold"}}>Encryption: </Text>
            <Text>{encryptionStatus}</Text>
            {enabled &&
              <Text> | {encryptionType}</Text>
            }
          </Text>
          {!enabled &&
            <Text style={[textStyles, {marginTop: 4, color: GlobalStyles.constants().mainDimColor}]}>Sign in, register, or add a local passcode to enable encryption.</Text>
          }
        </SectionedTableCell>

        {enabled &&
          <SectionedTableCell>
            <Text style={textStyles}>
              <Text style={{fontWeight: "bold"}}>Encryption Source: </Text>
              <Text>{sourceString}</Text>
            </Text>
          </SectionedTableCell>
        }

        {enabled &&
          <SectionedTableCell>
            <Text style={textStyles}>
              <Text style={{fontWeight: "bold"}}>Items Encrypted: </Text>
              <Text>{itemsStatus}</Text>
            </Text>
          </SectionedTableCell>
        }


      </TableSection>
    );
  }
}

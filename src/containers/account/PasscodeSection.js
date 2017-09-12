import React, { Component } from 'react';
import GlobalStyles from "../../Styles"
import {TextInput, View} from 'react-native';

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
    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        {this.props.hasPasscode &&
          <SectionedTableCell buttonCell={true} first={true}>
            <ButtonCell leftAligned={true} title="Disable Passcode Lock" onPress={this.props.onDisable} />
          </SectionedTableCell>
        }

        {!this.props.hasPasscode &&
          <SectionedTableCell buttonCell={true} first={true}>
            <ButtonCell leftAligned={true} title="Enable Passcode Lock" onPress={this.props.onEnable} />
          </SectionedTableCell>
        }

      </TableSection>
    );
  }
}

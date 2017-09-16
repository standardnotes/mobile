import React, { Component } from 'react';
import GlobalStyles from "../../Styles"
import {TextInput, View} from 'react-native';

import SectionHeader from "../../components/SectionHeader";
import ButtonCell from "../../components/ButtonCell";
import TableSection from "../../components/TableSection";
import SectionedTableCell from "../../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../../components/SectionedAccessoryTableCell";

export default class OptionsSection extends Component {
  render() {
    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        {this.props.signedIn &&
          <SectionedTableCell buttonCell={true} first={true}>
            <ButtonCell leftAligned={true} title={`Sign out (${this.props.email})`} onPress={this.props.onSignOutPress} />
          </SectionedTableCell>
        }

        <SectionedTableCell buttonCell={true} first={!this.props.signedIn}>
          <ButtonCell leftAligned={true} title="Export Data" onPress={this.props.onExportPress} />
        </SectionedTableCell>

      </TableSection>
    );
  }
}

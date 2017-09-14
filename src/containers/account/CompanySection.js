import React, { Component } from 'react';
import GlobalStyles from "../../Styles"
import {TextInput, View} from 'react-native';

import SectionHeader from "../../components/SectionHeader";
import ButtonCell from "../../components/ButtonCell";
import TableSection from "../../components/TableSection";
import SectionedTableCell from "../../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../../components/SectionedAccessoryTableCell";

export default class CompanySection extends Component {
  render() {
    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        <SectionedTableCell buttonCell={true} first={true}>
          <ButtonCell leftAligned={true} title="Send Feedback" onPress={() => this.props.onAction("feedback")} />
        </SectionedTableCell>

        <SectionedTableCell buttonCell={true}>
          <ButtonCell leftAligned={true} title="Learn more about Standard Notes" onPress={() => this.props.onAction("learn_more")} />
        </SectionedTableCell>

        <SectionedTableCell buttonCell={true}>
          <ButtonCell leftAligned={true} title="Our Privacy Manifesto" onPress={() => this.props.onAction("privacy")} />
        </SectionedTableCell>

        <SectionedTableCell buttonCell={true}>
          <ButtonCell leftAligned={true} title="Our Twitter" onPress={() => this.props.onAction("twitter")} />
        </SectionedTableCell>

      </TableSection>
    );
  }
}

import React, { Component } from 'react';
import GlobalStyles from "../../Styles"
import {TextInput, View} from 'react-native';

import SectionHeader from "../../components/SectionHeader";
import ButtonCell from "../../components/ButtonCell";
import TableSection from "../../components/TableSection";
import SectionedTableCell from "../../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../../components/SectionedAccessoryTableCell";

export default class OptionsSection extends Component {

  constructor(props) {
    super(props);
    this.state = {loadingExport: false};
  }

  onExportPress = () => {
    this.setState({loadingExport: true});
    this.props.onExportPress(() => {
      this.setState({loadingExport: false});
    })
  }

  render() {
    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        {this.props.signedIn &&
          <ButtonCell first={true} leftAligned={true} title={`Sign out (${this.props.email})`} onPress={this.props.onSignOutPress} />
        }

        <ButtonCell last={true} first={!this.props.signedIn} disabled={this.state.loadingExport} leftAligned={true} title={this.state.loadingExport ? "Preparing Data..." : "Export Data"} onPress={this.onExportPress} />

      </TableSection>
    );
  }
}

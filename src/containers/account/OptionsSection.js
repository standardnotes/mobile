import React, { Component } from 'react';
import {Alert} from 'react-native';
import GlobalStyles from "../../Styles"
import {TextInput, View} from 'react-native';
import SectionHeader from "../../components/SectionHeader";
import ButtonCell from "../../components/ButtonCell";
import TableSection from "../../components/TableSection";
import SectionedTableCell from "../../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../../components/SectionedAccessoryTableCell";
import SectionedOptionsTableCell from "../../components/SectionedOptionsTableCell";

export default class OptionsSection extends Component {

  constructor(props) {
    super(props);
    this.state = {loadingExport: false};
  }

  onExportPress = (option) => {
    let encrypted = option.key == "encrypted";
    if(encrypted && !this.props.encryptionAvailable) {
      Alert.alert('Not Available', "You must be signed in, or have a local passcode set, to generate an encrypted export file.", [{text: 'OK'}])
      return;
    }
    this.setState({loadingExport: true});
    this.props.onExportPress(encrypted, () => {
      this.setState({loadingExport: false});
    })
  }

  exportOptions = () => {
    return [
      {title: "Encrypted", key: "encrypted", selected: this.props.encryptionAvailable},
      {title: "Decrypted", key: "decrypted", selected: true}
    ];
  }

  render() {
    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        {this.props.signedIn &&
          <ButtonCell first={true} leftAligned={true} title={`Sign out (${this.props.email})`} onPress={this.props.onSignOutPress} />
        }

        <SectionedOptionsTableCell
          last={true}
          first={!this.props.signedIn}
          disabled={this.state.loadingExport}
          leftAligned={true}
          options={this.exportOptions()}
          title={this.state.loadingExport ? "Preparing Data..." : "Export Data"}
          onPress={this.onExportPress}
        />

      </TableSection>
    );
  }
}

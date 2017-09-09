import React, { Component } from 'react';
import { TextInput, SectionList, ScrollView, View, Text } from 'react-native';
import SectionHeader from "../components/SectionHeader";
import TableSection from "../components/TableSection";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";

import GlobalStyles from "../Styles"

export default class SortSection extends Component {
  constructor(props) {
    super(props);
  }

  onPress = (key) => {
    this.props.onEvent(key);
  }

  render() {
    let root = this;
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />
          <SectionedAccessoryTableCell onPress={() => {this.onPress("pin")}} first={true} text={"Pin"} buttonCell={true} />
          <SectionedAccessoryTableCell onPress={() => {this.onPress("archive")}} text={"Archive"} buttonCell={true} />
          <SectionedAccessoryTableCell onPress={() => {this.onPress("share")}} text={"Share"} buttonCell={true} />
          <SectionedAccessoryTableCell onPress={() => {this.onPress("delete")}} text={"Delete"} buttonCell={true} />
      </TableSection>
    );
  }
}

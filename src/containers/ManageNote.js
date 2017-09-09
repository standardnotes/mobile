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
    this.forceUpdate();
  }

  render() {
    let root = this;
    var pinAction = this.props.note.pinned ? "Unpin" : "Pin";
    var archiveOption = this.props.note.archived ? "Unarchive" : "Archive";
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />
          <SectionedAccessoryTableCell
            onPress={() => {this.onPress(pinAction.toLowerCase())}}
            first={true} text={pinAction} buttonCell={true}
          />
          <SectionedAccessoryTableCell
            onPress={() => {this.onPress(archiveOption.toLowerCase())}}
            text={archiveOption} buttonCell={true}
          />
          <SectionedAccessoryTableCell onPress={() => {this.onPress("share")}} text={"Share"} buttonCell={true} />
          <SectionedAccessoryTableCell onPress={() => {this.onPress("delete")}} text={"Delete"} buttonCell={true} />
      </TableSection>
    );
  }
}

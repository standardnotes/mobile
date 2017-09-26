import React, { Component } from 'react';
import { TextInput, SectionList, ScrollView, View, Text, Platform } from 'react-native';
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
    var iconPrefix = Platform.OS == "android" ? "md" : "ios";
    var suffix = Platform.OS == "android" ? "" : "-outline";
    function nameForIcon(iconName) {
      return iconPrefix + "-" + iconName + suffix;
    }
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />
          <SectionedAccessoryTableCell
            iconName={nameForIcon("flag")}
            onPress={() => {this.onPress(pinAction.toLowerCase())}}
            first={true} text={pinAction}
            leftAlignIcon={true}
          />

          <SectionedAccessoryTableCell
            iconName={nameForIcon("archive")}
            onPress={() => {this.onPress(archiveOption.toLowerCase())}}
            text={archiveOption}
            leftAlignIcon={true}
          />

          <SectionedAccessoryTableCell
          iconName={nameForIcon("share")}
          onPress={() => {this.onPress("share")}}
          text={"Share"}
          leftAlignIcon={true}
          />

          <SectionedAccessoryTableCell
          iconName={nameForIcon("trash")}
          onPress={() => {this.onPress("delete")}}
          text={"Delete"}
          leftAlignIcon={true}
          />
      </TableSection>
    );
  }
}

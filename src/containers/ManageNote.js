import React, { Component } from 'react';
import { TextInput, SectionList, ScrollView, View, Text, Platform } from 'react-native';
import SectionHeader from "../components/SectionHeader";
import TableSection from "../components/TableSection";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";
import ItemActionManager from '../lib/itemActionManager'

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
    let pinEvent = pinAction == "Pin" ? ItemActionManager.PinEvent : ItemActionManager.UnpinEvent;

    var archiveOption = this.props.note.archived ? "Unarchive" : "Archive";
    let archiveEvent = archiveOption == "Archive" ? ItemActionManager.ArchiveEvent : ItemActionManager.UnarchiveEvent;

    var iconPrefix = Platform.OS == "android" ? "md" : "ios";
    var suffix = Platform.OS == "android" ? "" : "-outline";
    function nameForIcon(iconName) {
      return iconPrefix + "-" + iconName + suffix;
    }
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />
          <SectionedAccessoryTableCell
            iconName={nameForIcon("bookmark")}
            onPress={() => {this.onPress(pinEvent)}}
            first={true} text={pinAction}
            leftAlignIcon={true}
          />

          <SectionedAccessoryTableCell
            iconName={nameForIcon("archive")}
            onPress={() => {this.onPress(archiveEvent)}}
            text={archiveOption}
            leftAlignIcon={true}
          />

          <SectionedAccessoryTableCell
          iconName={nameForIcon("share")}
          onPress={() => {this.onPress(ItemActionManager.ShareEvent)}}
          text={"Share"}
          leftAlignIcon={true}
          />

          <SectionedAccessoryTableCell
          iconName={nameForIcon("trash")}
          onPress={() => {this.onPress(ItemActionManager.DeleteEvent)}}
          text={"Delete"}
          last={true}
          leftAlignIcon={true}
          />
      </TableSection>
    );
  }
}

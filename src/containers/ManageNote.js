import React, { Component } from 'react';
import { TextInput, SectionList, ScrollView, View, Text, Platform } from 'react-native';
import SectionHeader from "../components/SectionHeader";
import TableSection from "../components/TableSection";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";
import ItemActionManager from '../lib/itemActionManager'
import Icons from "../Icons";

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

    var lockOption = this.props.note.locked ? "Unlock" : "Lock";
    let lockEvent = lockOption == "Lock" ? ItemActionManager.LockEvent : ItemActionManager.UnlockEvent;

    return (
      <TableSection>
        <SectionHeader title={this.props.title} />
          <SectionedAccessoryTableCell
            iconName={Icons.nameForIcon("bookmark")}
            onPress={() => {this.onPress(pinEvent)}}
            first={true} text={pinAction}
            leftAlignIcon={true}
          />

          <SectionedAccessoryTableCell
            iconName={Icons.nameForIcon("archive")}
            onPress={() => {this.onPress(archiveEvent)}}
            text={archiveOption}
            leftAlignIcon={true}
          />

          <SectionedAccessoryTableCell
            iconName={Icons.nameForIcon("lock")}
            onPress={() => {this.onPress(lockEvent)}}
            text={lockOption}
            leftAlignIcon={true}
          />

          <SectionedAccessoryTableCell
          iconName={Icons.nameForIcon("share")}
          onPress={() => {this.onPress(ItemActionManager.ShareEvent)}}
          text={"Share"}
          leftAlignIcon={true}
          />

          <SectionedAccessoryTableCell
          iconName={Icons.nameForIcon("trash")}
          onPress={() => {this.onPress(ItemActionManager.DeleteEvent)}}
          text={"Delete"}
          last={true}
          leftAlignIcon={true}
          />
      </TableSection>
    );
  }
}

import React, { Component } from 'react';
import { ScrollView, View, Text, Linking, Share, StatusBar } from 'react-native';
import Abstract from "./Abstract"

import Sync from '../lib/sfjs/syncManager'
import ModelManager from '../lib/sfjs/modelManager'
import ComponentManager from '../lib/componentManager'
import ItemActionManager from '../lib/itemActionManager'

import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import LockedView from "../containers/LockedView";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";

import Icons from '@Style/Icons';
import StyleKit from "@Style/StyleKit"

import ApplicationState from "../ApplicationState";
import OptionsState from "../OptionsState";
import Icon from 'react-native-vector-icons/Ionicons';
import FAB from 'react-native-fab';

export default class NoteOptions extends Abstract {

  static navigationOptions = ({ navigation, navigationOptions }) => {
    let templateOptions = {
      title: "Manage Note"
    }
    return Abstract.getDefaultNavigationOptions({navigation, navigationOptions, templateOptions});
  };

  constructor(props) {
    super(props);
    this.tags = [];
  }

  loadInitialState() {
    super.loadInitialState();

    if(this.getProp("options")) {
      this.options = new OptionsState(JSON.parse(this.getProp("options")));
    }

    var selectedTags;
    if(this.options.selectedTags) {
      selectedTags = this.options.selectedTags.slice(); // copy the array
    } else {
      selectedTags = [];
    }

    this.mergeState({tags: [], selectedTags: selectedTags, options: this.options});

    this.note = ModelManager.get().findItem(this.getProp("noteId"));

    let handleInitialDataLoad = () => {
      if(this.handledDataLoad) { return; }
      this.handledDataLoad = true;

      this.tagsNeedReload = true;
      this.forceUpdate();
    }

    if(Sync.get().initialDataLoaded()) {
      handleInitialDataLoad();
    }

    this.syncEventHandler = Sync.get().addEventHandler((event, data) => {
      if(event == "local-data-loaded") {
        handleInitialDataLoad();
      }

      else if(event == "sync:completed") {
        if(data.retrievedItems && _.find(data.retrievedItems, {content_type: "Tag"})) {
          this.forceUpdate();
        }
      }
    })
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    ApplicationState.get().removeStateObserver(this.stateObserver);
    Sync.get().removeEventHandler(this.syncEventHandler);
  }

  componentDidFocus() {
    super.componentDidFocus();
    this.forceUpdate();
  }

  componentDidBlur() {
    super.componentDidBlur();
    this.notifyParentOfOptionsChange();
  }

  notifyParentOfOptionsChange() {
    this.getProp("onOptionsChange")(this.options);
  }

  presentNewTag() {
    this.props.navigation.navigate("InputModal", {
      title: 'New Tag',
      placeholder: "New tag name",
      onSave: (text) => {
        this.createTag(text, (tag) => {
          if(this.note) {
            // select this tag
            this.onTagSelect(tag)
          }
        });
      }
    })
  }

  createTag(text, callback) {
    var tag = new SNTag({content: {title: text}});
    tag.initUUID().then(() => {
      tag.setDirty(true);
      ModelManager.get().addItem(tag);
      Sync.get().sync();
      callback(tag);
      this.forceUpdate();
    })
  }

  onTagSelect = (tag) => {
    var selectedTags = this.state.selectedTags;
    var selected = selectedTags.includes(tag.uuid);
    if(selected) {
      // deselect
      selectedTags.splice(selectedTags.indexOf(tag.uuid), 1);
    } else {
      // select
      selectedTags.push(tag.uuid);
    }

    this.setSelectedTags(selectedTags);
  }

  setSelectedTags = (selectedTags) => {
    this.selectedTags = selectedTags.slice();
    this.options.setSelectedTags(selectedTags);
    this.setState({selectedTags: selectedTags});
  }

  isTagSelected(tag) {
    return this.tags.indexOf(tag.uuid) !== -1;
  }

  onManageTagEvent = (event, tag, renderBlock) => {
    ItemActionManager.handleEvent(event, tag, () => {
      if(event == ItemActionManager.DeleteEvent) {
        this.tagsNeedReload = true;
        this.forceUpdate();
      }
    }, () => {
      // afterConfirmCallback
      // We want to show "Deleting.." on top of note cell after the user confirms the dialogue
      renderBlock();
    })
  }

  onManageNoteEvent(event) {
    ItemActionManager.handleEvent(event, this.note, () => {
        this.getProp("onManageNoteEvent")();
        if(event == ItemActionManager.DeleteEvent) {
          this.popToRoot();
        } else {
          this.forceUpdate();
        }
    })
  }

  clearTags = (close) => {
    this.setSelectedTags([]);
    if(close) { this.dismiss(); }
  }

  render() {
    var viewStyles = [StyleKit.styles.container];

    if(this.state.lockContent) {
      return (<LockedView style={viewStyles} />);
    }

    if(this.tagsNeedReload) {
      var tags = ModelManager.get().tags.slice();
      this.tags = tags;
      this.tagsNeedReload = false;
    }

    var pinAction = this.note.pinned ? "Unpin" : "Pin";
    let pinEvent = pinAction == "Pin" ? ItemActionManager.PinEvent : ItemActionManager.UnpinEvent;

    var archiveOption = this.note.archived ? "Unarchive" : "Archive";
    let archiveEvent = archiveOption == "Archive" ? ItemActionManager.ArchiveEvent : ItemActionManager.UnarchiveEvent;

    var lockOption = this.note.locked ? "Unlock" : "Lock";
    let lockEvent = lockOption == "Lock" ? ItemActionManager.LockEvent : ItemActionManager.UnlockEvent;

    return (
      <View style={viewStyles}>
        <ScrollView style={StyleKit.styles.view}>

          <TableSection>
            <SectionHeader title={"Manage Note"} />
              <SectionedAccessoryTableCell
                iconName={Icons.nameForIcon("bookmark")}
                onPress={() => {this.onManageNoteEvent(pinEvent)}}
                first={true} text={pinAction}
                leftAlignIcon={true}
              />

              <SectionedAccessoryTableCell
                iconName={Icons.nameForIcon("archive")}
                onPress={() => {this.onManageNoteEvent(archiveEvent)}}
                text={archiveOption}
                leftAlignIcon={true}
              />

              <SectionedAccessoryTableCell
                iconName={Icons.nameForIcon("lock")}
                onPress={() => {this.onManageNoteEvent(lockEvent)}}
                text={lockOption}
                leftAlignIcon={true}
              />

              <SectionedAccessoryTableCell
                iconName={Icons.nameForIcon("share")}
                onPress={() => {this.onManageNoteEvent(ItemActionManager.ShareEvent)}}
                text={"Share"}
                leftAlignIcon={true}
              />

              <SectionedAccessoryTableCell
                iconName={Icons.nameForIcon("trash")}
                onPress={() => {this.onManageNoteEvent(ItemActionManager.DeleteEvent)}}
                text={"Delete"}
                last={true}
                leftAlignIcon={true}
              />
          </TableSection>

          <TagList
            tags={this.tags}
            selected={this.state.selectedTags}
            onTagSelect={this.onTagSelect}
            clearSelection={this.clearTags}
            onManageTagEvent={this.onManageTagEvent}
            title={"Tags"}
           />

        </ScrollView>

        <FAB
          buttonColor={StyleKit.variable("stylekitInfoColor")}
          iconTextColor={StyleKit.variable("stylekitBackgroundColor")}
          onClickAction={() => {this.presentNewTag()}}
          visible={true}
          iconTextComponent={<Icon name={"md-pricetag"}/>}
        />

      </View>
    );
  }
}

import React, { Component } from 'react';
import { ScrollView, View, Text } from 'react-native';
import Sync from '../lib/sfjs/syncManager'
import ModelManager from '../lib/sfjs/modelManager'
import ItemActionManager from '../lib/itemActionManager'
import SectionHeader from "../components/SectionHeader";
import TableSection from "../components/TableSection";
import LockedView from "../containers/LockedView";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";
import Abstract from "./Abstract"
import Icons from '../Icons';
import OptionsState from "../OptionsState"
import StyleKit from "../style/StyleKit"
import ApplicationState from "../ApplicationState";
import TagList from "../containers/TagList";

import { SafeAreaView } from 'react-navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import FAB from 'react-native-fab';

export default class SideMenu extends Abstract {

  constructor(props) {
    super(props);
    this.constructState({});
    this.tags = [];
    this.options = ApplicationState.getOptions();
  }

  loadInitialState() {
    super.loadInitialState();

    var selectedTags;
    if(this.options.selectedTags) {
      selectedTags = this.options.selectedTags.slice(); // copy the array
    } else {
      selectedTags = [];
    }

    this.mergeState({tags: [], selectedTags: selectedTags, options: this.options});

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

    this.setState({initialDataLoaded: true});
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

  presentNewTag() {
    this.props.navigation.navigate("NewTag", {
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
    var selectedTags = [tag.uuid];
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

  presentSettings() {
    this.props.navigation.navigate("Settings");
  }

  render() {
    var viewStyles = [StyleKit.styles().container];

    if(this.state.lockContent || !this.state.initialDataLoaded) {
      return (<LockedView style={viewStyles} />);
    }

    if(this.tagsNeedReload) {
      var tags = ModelManager.get().tags.slice();
      tags.unshift({title: "All notes", key: "all", uuid: 100})
      this.tags = tags;
      this.tagsNeedReload = false;
    }

    return (
      <SafeAreaView style={viewStyles}>
        <ScrollView style={StyleKit.styles().view}>
          <TagList
            tags={this.tags}
            selected={this.state.selectedTags}
            onTagSelect={this.onTagSelect}
            onManageTagEvent={this.onManageTagEvent}
            title={"Tags"}
           />
        </ScrollView>

        <FAB
          buttonColor={StyleKit.variable("stylekitInfoColor")}
          iconTextColor={StyleKit.variable("stylekitInfoContrastColor")}
          onClickAction={() => {this.note ? this.presentNewTag() : this.presentSettings()}}
          visible={true}
          iconTextComponent={<Icon name={this.note ? "md-pricetag" : "md-settings"}/>}
        />

      </SafeAreaView>
    );
  }
}

import React, { Component } from 'react';
import { ScrollView, View, Text, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import Sync from '@SFJS/syncManager'
import ItemActionManager from '@Lib/itemActionManager'
import ModelManager from '@SFJS/modelManager'

import ActionSheet from 'react-native-actionsheet'
import Icons from '@Style/Icons';
import StyleKit from "@Style/StyleKit"
import SideMenuCell from "@SideMenu/SideMenuCell"

import ApplicationState from "@Root/ApplicationState";
import OptionsState from "@Root/OptionsState"

export default class TagSelectionList extends Component {

  /*
    @param props.selectedTags
    @param props.onTagSelect
  */

  constructor(props) {
    super(props);
    this.state = {tags: []};
    this.loadStyles();
  }

  componentDidMount() {
    let handleInitialDataLoad = () => {
      if(this.handledDataLoad) { return; }
      this.handledDataLoad = true;
      this.reloadTags();
    }

    if(Sync.get().initialDataLoaded()) {
      handleInitialDataLoad();
    }

    this.syncEventHandler = Sync.get().addEventHandler((event, data) => {
      if(event == "local-data-loaded") {
        handleInitialDataLoad();
      }

      else if(event == "sync:completed") {
        if(data.retrievedItems && _.find(data.retrievedItems, {content_type: this.props.contentType})) {
          this.reloadTags();
        }
      }
    })
  }

  componentWillUnmount() {
    Sync.get().removeEventHandler(this.syncEventHandler);
  }

  reloadTags() {
    let tags;
    if(this.props.contentType == "Tag") {
      tags = ModelManager.get().tags.slice();
    } else {
      tags = ModelManager.get().getSmartTags();
    }
    this.setState({tags: tags});
  }

  /*
  Tag Options
  */

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
    this.props.onTagSelect(tag);
  }

  onManageTagEvent = (event, tag, renderBlock) => {
    ItemActionManager.handleEvent(event, tag, () => {
        if(event == ItemActionManager.DeleteEvent) {
          this.reloadTags();
        }
    }, () => {
      // afterConfirmCallback
      // We want to show "Deleting.." on top of note cell after the user confirms the dialogue
      renderBlock();
    })
  }

  static ActionSheetCancelIndex = 0;
  static ActionSheetDestructiveIndex = 1;

  actionSheetActions() {
    return [
      ['Cancel', ""],
      ['Delete', ItemActionManager.DeleteEvent]
    ];
  }

  showActionSheet = (item) => {
    // Dont show actionsheet for "All notes" tag
    if(item.key !== "all") {
      this.actionSheetItem = item;
      this.setState((prevState) => {
        return _.merge(prevState, {actionSheetTitle: item.title})
      })
      this.actionSheet.show();
    }
  }

  handleActionSheetPress = (index) => {
    if(index == 0) {
      return;
    }

    this.onManageTagEvent(this.actionSheetActions()[index][1], this.actionSheetItem, () => {
      this.forceUpdate();
    });
    this.actionSheetItem = null;
  }

  iconDescriptorForTag = (tag) => {
    return {
      type: "ascii",
      value: "#"
    };
  }


  // must pass title, text, and tags as props so that it re-renders when either of those change
  renderTagCell = ({item}) => {
    return (
      <View>
        <SideMenuCell
          onSelect={() => {this.onTagSelect(item)}}
          onLongPress={() => this.showActionSheet(item)}
          text={item.deleted ? "Deleting..." : item.title}
          iconDesc={this.iconDescriptorForTag(item)}
          key={item.uuid}
          selected={this.props.selectedTags.includes(item)}
        />

        <ActionSheet
          title={this.state.actionSheetTitle}
          ref={o => this.actionSheet = o}
          options={this.actionSheetActions().map((action) => {return action[0]})}
          cancelButtonIndex={TagSelectionList.ActionSheetCancelIndex}
          destructiveButtonIndex={TagSelectionList.ActionSheetDestructiveIndex}
          onPress={this.handleActionSheetPress}
          {...StyleKit.actionSheetStyles()}
        />
      </View>
    )
  }

  render() {
    return (
      <FlatList
        initialNumToRender={10}
        windowSize={10}
        maxToRenderPerBatch={10}
        data={this.state.tags}
        renderItem={this.renderTagCell}
        extraData={this.props.selectedTags /* Required to force list cells to update on selection change */}
      />
    )
  }

  loadStyles() {
    this.styles = {

    }
  }
}

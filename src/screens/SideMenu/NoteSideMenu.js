import React, { Component, Fragment } from 'react';
import { ScrollView, View, Text, FlatList } from 'react-native';

import { SafeAreaView } from 'react-navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import FAB from 'react-native-fab';
import ActionSheet from 'react-native-actionsheet'

import Abstract from "@Screens/Abstract"

import SectionHeader from "@Components/SectionHeader";
import TableSection from "@Components/TableSection";
import LockedView from "@Containers/LockedView";

import Icons from '@Style/Icons';
import StyleKit from "@Style/StyleKit"

import SideMenuManager from "@SideMenu/SideMenuManager"
import SideMenuCell from "@SideMenu/SideMenuCell"
import SideMenuHero from "@SideMenu/SideMenuHero"
import SideMenuSection from "@SideMenu/SideMenuSection"
import TagSelectionList from "@SideMenu/TagSelectionList"

import ApplicationState from "@Root/ApplicationState";

export default class NoteSideMenu extends Abstract {

  constructor(props) {
    super(props);
    this.loadStyles();
    this.constructState({});
  }

  get handler() {
    return SideMenuManager.get().getHandlerForRightSideMenu();
  }

  onEditorSelect = (editor) => {
    this.handler.onEditorSelect(editor)
  }

  onTagSelect = (tag) => {
    this.handler.onTagSelect(tag);
    this.forceUpdate();
  }


  /*
  Render
  */

  iconDescriptorForEditor = (editor) => {
    let desc = {
      type: "circle",
      side: "right",
      backgroundColor: "red",
      borderColor: "red"
    };

    return desc;
  }

  buildOptionsForEditors() {
    let editors = []; // TODO
    let options = [];
    for(var editor of editors) {
      let option = SideMenuSection.BuildOption({
        text: editor.name,
        key: editor.uuid || editor.name,
        iconDesc: this.iconDescriptorForEditor(editor),
        selected: editor.active,
        onSelect: () => {this.onEditorSelect(editor)},
      })

      options.push(option);
    }

    // Default
    if(editors.length == 1) {
      options.push(SideMenuSection.BuildOption({
        text: "Get Editors",
        key: "get-editors",
        onSelect: () => { Linking.openURL("https://standardnotes.org/extensions")},
      }));
    }

    return options;
  }

  render() {
    var viewStyles = [StyleKit.styles().container, this.styles.sideMenu];

    if(this.state.lockContent) {
      return (<LockedView style={viewStyles} />);
    }

    if(!this.handler || SideMenuManager.get().isRightSideMenuLocked()) {
      return null
    }


    let editorOptions = this.buildOptionsForEditors();
    let selectedTags = this.handler.getSelectedTags();

    return (
      <Fragment>
        <SafeAreaView style={[viewStyles, this.styles.safeArea]}>
          <ScrollView style={this.styles.scrollView} removeClippedSubviews={false}>

            <SideMenuSection title="Editors" options={editorOptions} collapsed={false} />

            <SideMenuSection title="Tags">
              <TagSelectionList onTagSelect={this.onTagSelect} selectedTags={selectedTags} />
            </SideMenuSection>

          </ScrollView>
        </SafeAreaView>
      </Fragment>
    );
  }

  loadStyles() {
    this.styles = {
      // We want top color to be different from bottom color of safe area.
      // See https://stackoverflow.com/questions/47725607/react-native-safeareaview-background-color-how-to-assign-two-different-backgro
      safeArea: {
        flex:0,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor
      },
      sideMenu: {
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
        color: StyleKit.variables.stylekitForegroundColor,
        flex: 1,
        flexDirection: "column"
      },
      scrollView: {
        padding: 15,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
      }
    }
  }
}

import React, { Component, Fragment } from 'react';
import { ScrollView, View, Text, FlatList } from 'react-native';

import { SafeAreaView } from 'react-navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import FAB from 'react-native-fab';
import ActionSheet from 'react-native-actionsheet'
import ComponentManager from "@Lib/componentManager"
import Abstract from "@Screens/Abstract"

import SectionHeader from "@Components/SectionHeader";
import TableSection from "@Components/TableSection";
import LockedView from "@Containers/LockedView";

import Icons from '@Style/Icons';
import StyleKit from "@Style/StyleKit"
import ActionSheetWrapper from "@Style/ActionSheetWrapper"

import SideMenuManager from "@SideMenu/SideMenuManager"
import SideMenuCell from "@SideMenu/SideMenuCell"
import SideMenuHero from "@SideMenu/SideMenuHero"
import SideMenuSection from "@SideMenu/SideMenuSection"
import TagSelectionList from "@SideMenu/TagSelectionList"

import ApplicationState from "@Root/ApplicationState";
import AbstractSideMenu from "@SideMenu/AbstractSideMenu"

export default class NoteSideMenu extends AbstractSideMenu {

  constructor(props) {
    super(props);
    this.constructState({});
  }

  get handler() {
    return SideMenuManager.get().getHandlerForRightSideMenu();
  }

  onEditorSelect = (editor) => {
    this.handler.onEditorSelect(editor);
    this.forceUpdate();
  }

  onTagSelect = (tag) => {
    this.handler.onTagSelect(tag);
    this.forceUpdate();
  }

  get note() {
    return this.handler.getCurrentNote();
  }

  onEditorLongPress = (editor) => {
    let currentDefaultEDitor = ComponentManager.get().getDefaultEditor();
    let isDefault = false;
    if(!editor) {
      // System editor
      if(currentDefaultEDitor)  {
        isDefault = false;
      }
    } else {
      isDefault = editor.content.isMobileDefault;
    }

    let action = isDefault ? "Remove as Default Editor" : "Set as Default Editor";
    let sheet = new ActionSheetWrapper({
      title: editor && editor.name,
      options: [
        ActionSheetWrapper.BuildOption({text: action, callback: () => {
          if(!editor) {
            // Default to plain
            ComponentManager.get().setEditorAsMobileDefault(currentDefaultEDitor, false);
          } else {
            ComponentManager.get().setEditorAsMobileDefault(editor, !isDefault);
          }
        }}),
      ], onCancel: () => {
        this.setState({actionSheet: null});
      }
    });

    this.setState({actionSheet: sheet.actionSheetElement()});
    sheet.show();
  }

  /*
  Render
  */

  buildOptionsForEditors() {
    let editors = ComponentManager.get().getEditors();
    let selectedEditor = ComponentManager.get().editorForNote(this.note);
    let options = [{
      text: "Plain Editor",
      key: "plain-editor",
      selected: !selectedEditor,
      onSelect: () => {this.onEditorSelect(null)},
      onLongPress: () => {this.onEditorLongPress(null)}
    }];

    for(let editor of editors) {
      let option = SideMenuSection.BuildOption({
        text: editor.name,
        key: editor.uuid || editor.name,
        selected: editor == selectedEditor,
        onSelect: () => {this.onEditorSelect(editor)},
        onLongPress: () => {this.onEditorLongPress(editor)}
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

            <SideMenuSection title="Editors" options={editorOptions} collapsed={true} />

            <SideMenuSection title="Tags">
              <TagSelectionList contentType="Tag" onTagSelect={this.onTagSelect} selectedTags={selectedTags} />
            </SideMenuSection>

          </ScrollView>
        </SafeAreaView>
        {this.state.actionSheet && this.state.actionSheet}
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

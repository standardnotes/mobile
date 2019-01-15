import React, { Component, Fragment } from 'react';
import { ScrollView, View, Text, FlatList, Linking } from 'react-native';

import { SafeAreaView } from 'react-navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import FAB from 'react-native-fab';
import ActionSheet from 'react-native-actionsheet'
import ComponentManager from "@Lib/componentManager"
import Abstract from "@Screens/Abstract"

import SectionHeader from "@Components/SectionHeader";
import TableSection from "@Components/TableSection";
import LockedView from "@Containers/LockedView";
import ItemActionManager from "@Lib/itemActionManager"

import StyleKit from "@Style/StyleKit"
import ActionSheetWrapper from "@Style/ActionSheetWrapper"
import ModelManager from '@SFJS/modelManager'
import Sync from '@SFJS/syncManager'

import SideMenuManager from "@SideMenu/SideMenuManager"
import SideMenuCell from "@SideMenu/SideMenuCell"
import SideMenuHero from "@SideMenu/SideMenuHero"
import SideMenuSection from "@SideMenu/SideMenuSection"
import TagSelectionList from "@SideMenu/TagSelectionList"

import ApplicationState from "@Lib/ApplicationState"
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

  presentNewTag = () => {
    this.props.navigation.navigate("InputModal", {
      title: 'New Tag',
      placeholder: "New tag name",
      onSubmit: (text) => {
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


  /*
  Render
  */

  runAction(action) {
    let run = () => {
      ItemActionManager.handleEvent(action, this.note, () => {
        if(action == ItemActionManager.TrashEvent
          || action == ItemActionManager.DeleteEvent
          || action == ItemActionManager.EmptyTrashEvent) {
          this.popToRoot();
        } else {
          this.forceUpdate();
          this.handler.onPropertyChange();
        }
      });
    }
    if(action == ItemActionManager.TrashEvent || action == ItemActionManager.DeleteEvent) {
      this.handlePrivilegedAction(true, SFPrivilegesManager.ActionDeleteNote, () => {
        run();
      })
    } else {
      run();
    }
  }

  buildOptionsForNoteManagement() {
    var pinOption = this.note.pinned ? "Unpin" : "Pin";
    let pinEvent = pinOption == "Pin" ? ItemActionManager.PinEvent : ItemActionManager.UnpinEvent;

    var archiveOption = this.note.archived ? "Unarchive" : "Archive";
    let archiveEvent = archiveOption == "Archive" ? ItemActionManager.ArchiveEvent : ItemActionManager.UnarchiveEvent;

    var lockOption = this.note.locked ? "Unlock" : "Lock";
    let lockEvent = lockOption == "Lock" ? ItemActionManager.LockEvent : ItemActionManager.UnlockEvent;

    var protectOption = this.note.content.protected ? "Unprotect" : "Protect";
    let protectEvent = protectOption == "Protect" ? ItemActionManager.ProtectEvent : ItemActionManager.UnprotectEvent;

    let rawOptions = [
      { text: pinOption, key: pinEvent, icon: "bookmark" },
      { text: archiveOption, key: archiveEvent, icon: "archive" },
      { text: lockOption, key: lockEvent, icon: "lock" },
      { text: protectOption, key: protectEvent, icon: "finger-print" },
      { text: "Share", key: ItemActionManager.ShareEvent, icon: "share" },
    ];

    if(!this.note.content.trashed) {
      rawOptions.push({ text: "Move to Trash", key: ItemActionManager.TrashEvent, icon: "trash" });
    }

    let options = [];
    for(let rawOption of rawOptions) {
      let option = SideMenuSection.BuildOption({
        text: rawOption.text,
        key: rawOption.key,
        iconDesc: { type: "icon", side: "right", name: StyleKit.nameForIcon(rawOption.icon) },
        onSelect: () => {
          this.runAction(rawOption.key);
        },
      })
      options.push(option);
    }

    return options;
  }

  buildOptionsForTrash() {
    if(!this.note.content.trashed) {
      return [];
    }

    let options = [
      {
        text: "Restore Note",
        key: "restore-note",
        onSelect: () => {
          this.note.content.trashed = false;
          this.note.setDirty(true);
          Sync.get().sync();
          this.forceUpdate();
        }
      },
      {
        text: "Delete Forever",
        key: "delete-forever",
        onSelect: () => {
          this.runAction(ItemActionManager.DeleteEvent);
        }
      },
      {
        text: "Empty Trash",
        key: "empty trash",
        onSelect: () => {
          this.runAction(ItemActionManager.EmptyTrashEvent);
        }
      },
    ]

    return options;
  }

  buildOptionsForEditors() {
    let editors = ComponentManager.get().getEditors().sort((a, b) => {
      if(!a.name || !b.name) { return -1; }
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    });
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
    if(options.length == 1) {
      options.push(SideMenuSection.BuildOption({
        text: "Get More Editors",
        key: "get-editors",
        iconDesc: {
          type: "icon",
          name: StyleKit.nameForIcon("medical"),
          side: "right",
          size: 17
        },
        onSelect: () => { Linking.openURL("https://standardnotes.org/extensions")},
      }));
    }

    return options;
  }

  render() {
    var viewStyles = [StyleKit.styles.container, this.styles.sideMenu];

    if(this.state.lockContent) {
      return (<LockedView style={viewStyles} />);
    }

    if(!this.handler || SideMenuManager.get().isRightSideMenuLocked()) {
      return <View style={viewStyles} />;
    }

    let noteOptions = this.buildOptionsForNoteManagement();
    let trashOptions = this.buildOptionsForTrash();
    let editorOptions = this.buildOptionsForEditors();
    let selectedTags = this.handler.getSelectedTags();

    return (
      <Fragment>
        <SafeAreaView style={[viewStyles, this.styles.safeArea]}>
          <ScrollView style={this.styles.scrollView} removeClippedSubviews={false}>

            <SideMenuSection title="Options" options={noteOptions} />

            {trashOptions.length > 0 &&
              <SideMenuSection title="Trash" options={trashOptions} />
            }

            <SideMenuSection title="Editors" options={editorOptions} collapsed={true} />

            <SideMenuSection title="Tags">
              <TagSelectionList
                hasBottomPadding={ApplicationState.isAndroid}
                contentType="Tag"
                onTagSelect={this.onTagSelect}
                selectedTags={selectedTags}
                emptyPlaceholder={"Create a new tag using the tag button in the bottom right corner."}
              />
            </SideMenuSection>

          </ScrollView>

          <FAB
            buttonColor={StyleKit.variables.stylekitInfoColor}
            iconTextColor={StyleKit.variables.stylekitInfoContrastColor}
            onClickAction={() => {this.presentNewTag()}}
            visible={true}
            size={30}
            paddingTop={ApplicationState.isIOS ? 1 : 0}
            iconTextComponent={<Icon name={StyleKit.nameForIcon("pricetag")}/>}
          />
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

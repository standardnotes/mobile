import React, { Fragment } from 'react';
import { View, FlatList } from 'react-native';
import FAB from 'react-native-fab';
import { SFPrivilegesManager, SNTag } from 'snjs';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-navigation';
import LockedView from '@Containers/LockedView';
import ApplicationState from '@Lib/ApplicationState';
import ComponentManager from '@Lib/componentManager';
import ItemActionManager from '@Lib/itemActionManager';
import { SCREEN_INPUT_MODAL, SCREEN_MANAGE_PRIVILEGES } from '@Screens/screens';
import ModelManager from '@Lib/snjs/modelManager';
import PrivilegesManager from '@Lib/snjs/privilegesManager';
import Sync from '@Lib/snjs/syncManager';
import AbstractSideMenu from '@Screens/SideMenu/AbstractSideMenu';
import SideMenuManager from '@Screens/SideMenu/SideMenuManager';
import SideMenuSection from '@Screens/SideMenu/SideMenuSection';
import TagSelectionList from '@Screens/SideMenu/TagSelectionList';
import ActionSheetWrapper from '@Style/ActionSheetWrapper';
import {
  ICON_BOOKMARK,
  ICON_ARCHIVE,
  ICON_LOCK,
  ICON_FINGER_PRINT,
  ICON_SHARE,
  ICON_TRASH,
  ICON_MEDICAL,
  ICON_PRICE_TAG,
} from '@Style/icons';
import StyleKit from '@Style/StyleKit';

export default class NoteSideMenu extends AbstractSideMenu {
  constructor(props) {
    super(props);
    this.constructState({});
  }

  get handler() {
    return SideMenuManager.get().getHandlerForRightSideMenu();
  }

  onEditorSelect = editor => {
    this.handler.onEditorSelect(editor);
    this.forceUpdate();
  };

  onTagSelect = tag => {
    this.handler.onTagSelect(tag);
    this.forceUpdate();
  };

  get note() {
    return this.handler.getCurrentNote();
  }

  onEditorLongPress = editor => {
    const currentDefaultEditor = ComponentManager.get().getDefaultEditor();

    let isDefault = false;
    if (!editor) {
      // System editor
      if (currentDefaultEditor) {
        isDefault = false;
      }
    } else {
      isDefault = editor.content.isMobileDefault;
    }

    let action = isDefault
      ? 'Remove as Mobile Default'
      : 'Set as Mobile Default';
    if (!editor && !currentDefaultEditor) {
      // Long pressing on plain editor while it is default, no actions available
      action = 'Is Mobile Default';
    }
    const sheet = new ActionSheetWrapper({
      title: editor && editor.name,
      options: [
        ActionSheetWrapper.BuildOption({
          text: action,
          callback: () => {
            if (!editor) {
              // Default to plain
              ComponentManager.get().setEditorAsMobileDefault(
                currentDefaultEditor,
                false
              );
            } else {
              ComponentManager.get().setEditorAsMobileDefault(
                editor,
                !isDefault
              );
            }
            this.forceUpdate();
          },
        }),
      ],
      onCancel: () => {
        this.setState({ actionSheet: null });
      },
    });

    this.setState({ actionSheet: sheet.actionSheetElement() });
    this.forceUpdate(); // required to get actionSheet ref
    sheet.show();
  };

  presentNewTag = () => {
    this.props.navigation.navigate(SCREEN_INPUT_MODAL, {
      title: 'New Tag',
      placeholder: 'New tag name',
      onSubmit: text => {
        this.createTag(text, tag => {
          if (this.note) {
            // select this tag
            this.onTagSelect(tag);
          }
        });
      },
    });
  };

  createTag(text, callback) {
    const tag = new SNTag({ content: { title: text } });
    tag.initUUID().then(() => {
      tag.setDirty(true);
      ModelManager.get().addItem(tag);
      Sync.get().sync();
      callback(tag);
      this.forceUpdate();
    });
  }

  /*
  Render
  */

  runAction(action) {
    let run = () => {
      ItemActionManager.handleEvent(action, this.note, async () => {
        if (
          action === ItemActionManager.ArchiveEvent ||
          action === ItemActionManager.TrashEvent ||
          action === ItemActionManager.DeleteEvent ||
          action === ItemActionManager.EmptyTrashEvent
        ) {
          this.popToRoot();
        } else {
          this.forceUpdate();
          this.handler.onPropertyChange();

          if (action === ItemActionManager.ProtectEvent) {
            // Show Privileges management screen if protected notes privs are not set up yet
            const configuredPrivs = await PrivilegesManager.get().grossCredentialsForAction(
              SFPrivilegesManager.ActionViewProtectedNotes
            );
            if (configuredPrivs.length === 0) {
              this.props.navigation.navigate(SCREEN_MANAGE_PRIVILEGES);
            }
          }
        }
      });
    };
    if (
      action === ItemActionManager.TrashEvent ||
      action === ItemActionManager.DeleteEvent
    ) {
      this.handlePrivilegedAction(
        true,
        SFPrivilegesManager.ActionDeleteNote,
        () => {
          run();
        }
      );
    } else {
      run();
    }
  }

  buildOptionsForNoteManagement() {
    const pinOption = this.note.pinned ? 'Unpin' : 'Pin';
    const pinEvent =
      pinOption === 'Pin'
        ? ItemActionManager.PinEvent
        : ItemActionManager.UnpinEvent;

    const archiveOption = this.note.archived ? 'Unarchive' : 'Archive';
    const archiveEvent =
      archiveOption === 'Archive'
        ? ItemActionManager.ArchiveEvent
        : ItemActionManager.UnarchiveEvent;

    const lockOption = this.note.locked ? 'Unlock' : 'Lock';
    const lockEvent =
      lockOption === 'Lock'
        ? ItemActionManager.LockEvent
        : ItemActionManager.UnlockEvent;

    const protectOption = this.note.content.protected ? 'Unprotect' : 'Protect';
    const protectEvent =
      protectOption === 'Protect'
        ? ItemActionManager.ProtectEvent
        : ItemActionManager.UnprotectEvent;

    const rawOptions = [
      { text: pinOption, key: pinEvent, icon: ICON_BOOKMARK },
      { text: archiveOption, key: archiveEvent, icon: ICON_ARCHIVE },
      { text: lockOption, key: lockEvent, icon: ICON_LOCK },
      { text: protectOption, key: protectEvent, icon: ICON_FINGER_PRINT },
      { text: 'Share', key: ItemActionManager.ShareEvent, icon: ICON_SHARE },
    ];

    if (!this.note.content.trashed) {
      rawOptions.push({
        text: 'Move to Trash',
        key: ItemActionManager.TrashEvent,
        icon: ICON_TRASH,
      });
    }

    let options = [];
    for (const rawOption of rawOptions) {
      let option = SideMenuSection.BuildOption({
        text: rawOption.text,
        key: rawOption.key,
        iconDesc: {
          type: 'icon',
          side: 'right',
          name: StyleKit.nameForIcon(rawOption.icon),
        },
        onSelect: () => {
          this.runAction(rawOption.key);
        },
      });
      options.push(option);
    }

    if (this.note.content.trashed) {
      options = options.concat([
        {
          text: 'Restore',
          key: 'restore-note',
          onSelect: () => {
            this.runAction(ItemActionManager.RestoreEvent);
          },
        },
        {
          text: 'Delete Permanently',
          textClass: 'danger',
          key: 'delete-forever',
          onSelect: () => {
            this.runAction(ItemActionManager.DeleteEvent);
          },
        },
        {
          text: 'Empty Trash',
          textClass: 'danger',
          key: 'empty trash',
          onSelect: () => {
            this.runAction(ItemActionManager.EmptyTrashEvent);
          },
        },
      ]);
    }

    return options;
  }

  buildOptionsForEditors() {
    const editors = ComponentManager.get()
      .getEditors()
      .sort((a, b) => {
        if (!a.name || !b.name) {
          return -1;
        }

        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      });
    const selectedEditor = ComponentManager.get().editorForNote(this.note);
    const options = [
      {
        text: 'Plain Editor',
        key: 'plain-editor',
        selected: !selectedEditor,
        onSelect: () => {
          this.onEditorSelect(null);
        },
        onLongPress: () => {
          this.onEditorLongPress(null);
        },
      },
    ];

    for (const editor of editors) {
      const option = SideMenuSection.BuildOption({
        text: editor.name,
        subtext: editor.content.isMobileDefault ? 'Mobile Default' : null,
        key: editor.uuid || editor.name,
        selected: editor === selectedEditor,
        onSelect: () => {
          this.onEditorSelect(editor);
        },
        onLongPress: () => {
          this.onEditorLongPress(editor);
        },
      });

      options.push(option);
    }

    // Default
    if (options.length === 1) {
      options.push(
        SideMenuSection.BuildOption({
          text: 'Get More Editors',
          key: 'get-editors',
          iconDesc: {
            type: 'icon',
            name: StyleKit.nameForIcon(ICON_MEDICAL),
            side: 'right',
            size: 17,
          },
          onSelect: () => {
            ApplicationState.openURL('https://standardnotes.org/extensions');
          },
        })
      );
    }

    return options;
  }

  render() {
    const viewStyles = [StyleKit.styles.container, this.styles.sideMenu];

    if (this.state.lockContent) {
      return <LockedView style={viewStyles} />;
    }

    if (!this.handler || SideMenuManager.get().isRightSideMenuLocked()) {
      return <View style={viewStyles} />;
    }

    const noteOptions = this.buildOptionsForNoteManagement();
    const editorOptions = this.buildOptionsForEditors();
    const selectedTags = this.handler.getSelectedTags();

    const sideMenuComponents = [
      <SideMenuSection
        title="Options"
        key="options-section"
        options={noteOptions}
      />,

      <SideMenuSection
        title="Editors"
        key="editors-section"
        options={editorOptions}
        collapsed={true}
      />,

      <SideMenuSection title="Tags" key="tags-section">
        <TagSelectionList
          key="tags-section-list"
          hasBottomPadding={ApplicationState.isAndroid}
          contentType="Tag"
          onTagSelect={this.onTagSelect}
          selectedTags={selectedTags}
          emptyPlaceholder={
            'Create a new tag using the tag button in the bottom right corner.'
          }
        />
      </SideMenuSection>,
    ];

    return (
      <Fragment>
        <SafeAreaView
          forceInset={{ left: 'never', bottom: 'always' }}
          style={[viewStyles, this.styles.safeArea]}
        >
          <FlatList
            style={this.styles.flatList}
            data={sideMenuComponents}
            renderItem={({ item }) => item}
          />

          <FAB
            buttonColor={StyleKit.variables.stylekitInfoColor}
            iconTextColor={StyleKit.variables.stylekitInfoContrastColor}
            onClickAction={() => {
              this.presentNewTag();
            }}
            visible={true}
            size={30}
            paddingTop={ApplicationState.isIOS ? 1 : 0}
            iconTextComponent={
              <Icon name={StyleKit.nameForIcon(ICON_PRICE_TAG)} />
            }
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
        flex: 0,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
      },
      sideMenu: {
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
        color: StyleKit.variables.stylekitForegroundColor,
        flex: 1,
        flexDirection: 'column',
      },
      flatList: {
        padding: 15,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
      },
    };
  }
}

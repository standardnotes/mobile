import { Editor } from '@Lib/editor';
import { useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import {
  ICON_ARCHIVE,
  ICON_BOOKMARK,
  ICON_FINGER_PRINT,
  ICON_LOCK,
  ICON_PRICE_TAG,
} from '@Style/icons';
import { StyleKit } from '@Style/StyleKit';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import FAB from 'react-native-fab';
import DrawerLayout from 'react-native-gesture-handler/DrawerLayout';
import Icon from 'react-native-vector-icons/Ionicons';
import { ContentType, NoteMutator, SNNote } from 'snjs';
import { ThemeContext } from 'styled-components/native';
import { SafeAreaContainer, StyledList } from './NoteSideMenu.styled';
import { SideMenuOption, SideMenuSection } from './SideMenuSection';
import { TagSelectionList } from './TagSelectionList';

type Props = {
  drawerRef: DrawerLayout | null;
};

export const NoteSideMenu = (props: Props) => {
  // Context
  const theme = useContext(ThemeContext);
  const application = useContext(ApplicationContext);
  const navigation = useNavigation();

  // State
  const [editor, setEditor] = useState<Editor | undefined>(undefined);
  const [note, setNote] = useState<SNNote | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    if (!editor && mounted) {
      const initialEditor = application?.editorGroup.activeEditor;
      const tempNote = initialEditor?.note;
      setEditor(initialEditor);
      setNote(tempNote);
    }
    return () => {
      mounted = false;
    };
  }, [application, editor]);

  useEffect(() => {
    let mounted = true;
    const removeEditorObserver = application?.editorGroup.addChangeObserver(
      activeEditor => {
        if (mounted) {
          setNote(activeEditor?.note);
          setEditor(activeEditor);
        }
      }
    );

    // const streamTags;

    return () => {
      mounted = false;
      removeEditorObserver && removeEditorObserver();
    };
  }, [application]);

  useEffect(() => {
    let mounted = true;
    const removeEditorNoteChangeObserver = editor?.addNoteChangeObserver(
      newNote => {
        if (mounted) {
          setNote(newNote);
        }
      }
    );
    const removeEditorNoteValueChangeObserver = editor?.addNoteValueChangeObserver(
      newNote => {
        if (mounted) {
          setNote(newNote);
        }
      }
    );
    return () => {
      mounted = false;
      removeEditorNoteChangeObserver && removeEditorNoteChangeObserver();
      removeEditorNoteValueChangeObserver &&
        removeEditorNoteValueChangeObserver();
    };
  }, [editor]);

  const changeNote = useCallback(
    async (mutate: (mutator: NoteMutator) => void) => {
      if (!editor || !note) {
        return;
      }

      if (note.deleted) {
        application?.alertService?.alert(
          'The note you are attempting to edit has been deleted, and is awaiting sync. Changes you make will be disregarded.'
        );
        return;
      }
      if (editor.isTemplateNote) {
        await editor.insertTemplatedNote();
        if (application?.getAppState().selectedTag?.isSmartTag() === false) {
          await application?.changeItem(
            application?.getAppState().selectedTag!.uuid,
            mutator => {
              mutator.addItemAsRelationship(note);
            }
          );
        }
      }
      if (!application?.findItem(note.uuid)) {
        application?.alertService!.alert(
          "The note you are attempting to save can not be found or has been deleted. Changes you make will not be synced. Please copy this note's text and start a new note."
        );
        return;
      }

      await application?.changeAndSaveItem(note.uuid, mutator => {
        const noteMutator = mutator as NoteMutator;
        mutate(noteMutator);
      });
    },
    [application, editor, note]
  );

  const leaveEditor = useCallback(() => {
    props.drawerRef?.closeDrawer();
    navigation.goBack();
  }, [props.drawerRef, navigation]);

  const noteOptions = useMemo(() => {
    if (!note) {
      return;
    }

    const pinOption = note.pinned ? 'Unpin' : 'Pin';
    const pinEvent = () =>
      changeNote(mutator => {
        mutator.pinned = !note.pinned;
      });

    const archiveOption = note.archived ? 'Unarchive' : 'Archive';
    const archiveEvent = () => {
      changeNote(mutator => {
        mutator.archived = !note.archived;
      });
      leaveEditor();
      application?.getAppState().closeEditor(editor!);
    };

    // TODO: close editor

    const lockOption = note.locked ? 'Unlock' : 'Lock';
    const lockEvent = () =>
      changeNote(mutator => {
        mutator.locked = !note.locked;
      });

    const protectOption = note.protected ? 'Unprotect' : 'Protect';
    const protectEvent = () =>
      changeNote(mutator => {
        mutator.protected = !note.protected;
      });

    const rawOptions = [
      { text: pinOption, onSelect: pinEvent, icon: ICON_BOOKMARK },
      { text: archiveOption, onSelect: archiveEvent, icon: ICON_ARCHIVE },
      { text: lockOption, onSelect: lockEvent, icon: ICON_LOCK },
      { text: protectOption, onSelect: protectEvent, icon: ICON_FINGER_PRINT },
      // { text: 'Share', key: ItemActionManager.ShareEvent, icon: ICON_SHARE },
    ];

    // if (!note.safeContent.trashed) {
    //   rawOptions.push({
    //     text: 'Move to Trash',
    //     key: ItemActionManager.TrashEvent,
    //     icon: ICON_TRASH,
    //   });
    // }

    let options: SideMenuOption[] = rawOptions.map(rawOption => ({
      text: rawOption.text,
      key: rawOption.icon,
      iconDesc: {
        type: 'icon',
        side: 'right' as 'right',
        name: StyleKit.nameForIcon(rawOption.icon),
      },
      onSelect: rawOption.onSelect,
    }));

    // if (note.safeContent.trashed) {
    //   options = options.concat([
    //     {
    //       text: 'Restore',
    //       key: 'restore-note',
    //       onSelect: () => {
    //         this.runAction(ItemActionManager.RestoreEvent);
    //       },
    //     },
    //     {
    //       text: 'Delete Permanently',
    //       textClass: 'danger' as 'danger',
    //       key: 'delete-forever',
    //       onSelect: () => {
    //         this.runAction(ItemActionManager.DeleteEvent);
    //       },
    //     },
    //     {
    //       text: 'Empty Trash',
    //       textClass: 'danger' as 'danger',
    //       key: 'empty trash',
    //       onSelect: () => {
    //         this.runAction(ItemActionManager.EmptyTrashEvent);
    //       },
    //     },
    //   ]);
    // }

    return options;
  }, [note, changeNote, leaveEditor, application, editor]);

  if (!editor || !note) {
    return null;
  }

  return (
    <SafeAreaContainer edges={['top', 'bottom', 'right']}>
      <StyledList
        data={[
          <SideMenuSection
            title="Options"
            key="options-section"
            options={noteOptions}
          />,

          <SideMenuSection
            title="Editors"
            key="editors-section"
            options={[]}
            collapsed={true}
          />,

          <SideMenuSection title="Tags" key="tags-section">
            <TagSelectionList
              key="tags-section-list"
              hasBottomPadding={Platform.OS === 'android'}
              contentType={ContentType.Tag}
              onTagSelect={() => {}}
              selectedTags={[]}
              emptyPlaceholder={
                'Create a new tag using the tag button in the bottom right corner.'
              }
            />
          </SideMenuSection>,
        ]}
        // @ts-expect-error
        renderItem={({ item }) => item}
      />

      <FAB
        buttonColor={theme.stylekitInfoColor}
        iconTextColor={theme.stylekitInfoContrastColor}
        onClickAction={() => {}}
        visible={true}
        size={30}
        paddingTop={Platform.OS === 'ios' ? 1 : 0}
        iconTextComponent={<Icon name={StyleKit.nameForIcon(ICON_PRICE_TAG)} />}
      />
    </SafeAreaContainer>
  );
};

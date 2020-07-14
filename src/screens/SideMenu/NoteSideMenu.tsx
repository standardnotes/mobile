import { Editor } from '@Lib/editor';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppStackNavigationProp } from '@Root/App';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_COMPOSE, SCREEN_INPUT_MODAL_TAG } from '@Root/screens2/screens';
import {
  ICON_ARCHIVE,
  ICON_BOOKMARK,
  ICON_FINGER_PRINT,
  ICON_LOCK,
  ICON_PRICE_TAG,
  ICON_SHARE,
  ICON_TRASH,
} from '@Style/icons';
import { StyleKit } from '@Style/StyleKit';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform, Share } from 'react-native';
import FAB from 'react-native-fab';
import DrawerLayout from 'react-native-gesture-handler/DrawerLayout';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  ButtonType,
  ContentType,
  NoteMutator,
  SNComponent,
  SNNote,
  SNSmartTag,
  SNTag,
} from 'snjs';
import { ThemeContext } from 'styled-components/native';
import { SafeAreaContainer, StyledList } from './NoteSideMenu.styled';
import { SideMenuOption, SideMenuSection } from './SideMenuSection';
import { TagSelectionList } from './TagSelectionList';

function sortAlphabetically(array: SNComponent[]): SNComponent[] {
  return array.sort((a, b) =>
    a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1
  );
}

type Props = {
  drawerRef: DrawerLayout | null;
};

export const NoteSideMenu = (props: Props) => {
  // Context
  const theme = useContext(ThemeContext);
  const application = useContext(ApplicationContext);
  const navigation = useNavigation<
    AppStackNavigationProp<typeof SCREEN_COMPOSE>['navigation']
  >();

  // State
  const [editor, setEditor] = useState<Editor | undefined>(undefined);
  const [note, setNote] = useState<SNNote | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<SNTag[]>([]);
  const [components, setComponents] = useState<SNComponent[]>([]);

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

  useEffect(() => {
    const removeComponentsObserver = application?.streamItems(
      ContentType.Component,
      async items => {
        if (!note) {
          return;
        }
        const displayComponents = sortAlphabetically([]);

        setComponents(displayComponents);

        // this.reloadComponentContext();
        // this.reloadNoteTagsComponent();
        /** Observe editor changes to see if the current note should update its editor */
        // const components = items as SNComponent[];
        // const editors = components.filter(component => {
        //   return component.isEditor();
        // });
        // if (editors.length) {
        //   /** Find the most recent editor for note */
        //   const { editor, changed } = await this.reloadComponentEditorState();
        //   if (!editor && changed) {
        //     this.reloadFont();
        //   }
        // }
      }
    );

    return removeComponentsObserver;
  }, [application, note]);

  const editorComponents = useMemo(() => {
    if (!note) {
      return [];
    }
    const componentEditor = application?.componentManager!.editorForNote(note);
    const options: SideMenuOption[] = [
      {
        text: 'Plain Editor',
        key: 'plain-editor',
        selected: !componentEditor,
        onSelect: () => {},
        onLongPress: () => {},
      },
    ];

    components.map(component => {
      options.push({
        text: component.name,
        subtext: component.isMobileDefault ? 'Mobile Default' : undefined,
        key: component.uuid || component.name,
        selected: component === componentEditor,
        onSelect: () => {},
        onLongPress: () => {},
      });
    });

    return options;
  }, [application?.componentManager, components, note]);

  const reloadTags = useCallback(() => {
    if (note) {
      const tags = application!.getAppState().getNoteTags(note);
      setSelectedTags(tags);
    }
  }, [application, note]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      if (mounted) {
        reloadTags();
      }

      return () => {
        mounted = false;
      };
    }, [reloadTags])
  );

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
    };

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

    const shareNote = () => {
      if (note) {
        application?.getAppState().performActionWithoutStateChangeImpact(() => {
          Share.share({
            title: note.title,
            message: note.text,
          });
        });
      }
    };

    const rawOptions = [
      { text: pinOption, onSelect: pinEvent, icon: ICON_BOOKMARK },
      { text: archiveOption, onSelect: archiveEvent, icon: ICON_ARCHIVE },
      { text: lockOption, onSelect: lockEvent, icon: ICON_LOCK },
      { text: protectOption, onSelect: protectEvent, icon: ICON_FINGER_PRINT },
      { text: 'Share', onSelect: shareNote, icon: ICON_SHARE },
    ];

    if (!note.safeContent.trashed) {
      rawOptions.push({
        text: 'Move to Trash',
        onSelect: async () => {
          const title = 'Move to Trash';
          const message =
            'Are you sure you want to move this note to the trash?';

          const confirmed = await application?.alertService?.confirm(
            message,
            title,
            'Confirm',
            ButtonType.Danger,
            'Cancel'
          );
          if (confirmed) {
            changeNote(mutator => {
              mutator.trashed = true;
            });
          }
        },
        icon: ICON_TRASH,
      });
    }

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

    if (note.safeContent.trashed) {
      options = options.concat([
        {
          text: 'Restore',
          key: 'restore-note',
          onSelect: () => {
            changeNote(mutator => {
              mutator.trashed = false;
            });
          },
        },
        {
          text: 'Delete Permanently',
          textClass: 'danger' as 'danger',
          key: 'delete-forever',
          onSelect: async () => {
            const title = `Delete ${note.safeTitle()}`;
            const message =
              'Are you sure you want to permanently delete this nite}?';
            if (editor?.isTemplateNote) {
              application?.alertService!.alert(
                'This note is a placeholder and cannot be deleted. To remove from your list, simply navigate to a different note.'
              );
              return;
            }
            if (note.locked) {
              application?.alertService!.alert(
                "This note is locked. If you'd like to delete it, unlock it, and try again."
              );
              return;
            }
            const confirmed = await application?.alertService?.confirm(
              message,
              title,
              'Delete',
              ButtonType.Danger,
              'Cancel'
            );
            if (confirmed) {
              await application?.deleteItem(note);
              props.drawerRef?.closeDrawer();
              navigation.popToTop();
            }
          },
        },
        {
          text: 'Empty Trash',
          textClass: 'danger' as 'danger',
          key: 'empty trash',
          onSelect: async () => {
            const count = application?.getTrashedItems().length;
            const confirmed = await application?.alertService?.confirm(
              `Are you sure you want to permanently delete ${count} notes?`,
              'Empty Trash',
              'Delete',
              ButtonType.Danger
            );
            if (confirmed) {
              await application?.emptyTrash();
              props.drawerRef?.closeDrawer();
              navigation.popToTop();
              application?.sync();
            }
          },
        },
      ]);
    }

    return options;
  }, [
    note,
    changeNote,
    leaveEditor,
    application,
    editor?.isTemplateNote,
    props.drawerRef,
    navigation,
  ]);

  const onTagSelect = useCallback(
    async (tag: SNTag | SNSmartTag) => {
      const isSelected =
        selectedTags.findIndex(selectedTag => selectedTag.uuid === tag.uuid) >
        -1;

      if (note) {
        if (isSelected) {
          await application?.changeItem(tag.uuid, mutator => {
            mutator.removeItemAsRelationship(note);
          });
        } else {
          await application?.changeItem(tag.uuid, mutator => {
            mutator.addItemAsRelationship(note);
          });
        }
      }
      reloadTags();
      application?.sync();
    },
    [application, note, reloadTags, selectedTags]
  );

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
            options={editorComponents}
            collapsed={true}
          />,

          <SideMenuSection title="Tags" key="tags-section">
            <TagSelectionList
              key="tags-section-list"
              hasBottomPadding={Platform.OS === 'android'}
              contentType={ContentType.Tag}
              onTagSelect={onTagSelect}
              selectedTags={selectedTags}
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
        onClickAction={() =>
          // @ts-expect-error
          navigation.navigate(SCREEN_INPUT_MODAL_TAG, { noteUuid: note.uuid })
        }
        visible={true}
        size={30}
        paddingTop={Platform.OS === 'ios' ? 1 : 0}
        iconTextComponent={<Icon name={StyleKit.nameForIcon(ICON_PRICE_TAG)} />}
      />
    </SafeAreaContainer>
  );
};

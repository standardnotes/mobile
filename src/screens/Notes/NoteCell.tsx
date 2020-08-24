import { ApplicationContext } from '@Root/ApplicationContext';
import {
  CustomActionSheetOption,
  useCustomActionSheet,
} from '@Style/useCustomActionSheet';
import React, { useCallback, useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import { ButtonType, isNullOrUndefined, NoteMutator, SNNote } from 'snjs';
import {
  Container,
  DateText,
  DeletedText,
  NoteText,
  TagsContainter,
  TagText,
  TitleText,
  TouchableContainer,
} from './NoteCell.styled';
import { NoteCellFlags } from './NoteCellFlags';

type Props = {
  note: SNNote;
  highlighted?: boolean;
  onPressItem: (itemUuid: SNNote['uuid']) => void;
  renderTags: boolean;
  sortType: string;
  tagsString: string;
};

export const NoteCell = ({
  note,
  onPressItem,
  highlighted,
  sortType,
  tagsString,
}: Props): JSX.Element => {
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [selected, setSelected] = useState(false);

  // Ref
  const selectionTimeout = useRef<NodeJS.Timeout>();
  const elementRef = useRef<View>(null);

  const { showActionSheet } = useCustomActionSheet();

  const highlight = Boolean(selected || highlighted);

  const _onPress = () => {
    setSelected(true);
    onPressItem(note.uuid);
    setSelected(false);
  };

  const _onPressIn = () => {
    // Debounce
    const delay = 25;
    selectionTimeout.current = setTimeout(() => {
      setSelected(true);
    }, delay);
  };

  const _onPressOut = () => {
    if (selectionTimeout.current) {
      clearTimeout(selectionTimeout.current);
    }
    setSelected(false);
  };

  const changeNote = useCallback(
    async (mutate: (mutator: NoteMutator) => void) => {
      if (!note) {
        return;
      }

      if (note.deleted) {
        application?.alertService?.alert(
          'The note you are attempting to edit has been deleted, and is awaiting sync. Changes you make will be disregarded.'
        );
        return;
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
    [application, note]
  );

  const onLongPress = () => {
    if (note.errorDecrypting) {
      return;
    }

    if (note.protected) {
      showActionSheet(
        note.safeTitle(),
        [
          {
            text: 'Note protected',
          },
        ],
        undefined,
        elementRef.current ?? undefined
      );
    } else {
      let options: CustomActionSheetOption[] = [];

      options.push({
        text: note.pinned ? 'Unpin' : 'Pin',
        key: 'pin',
        callback: () =>
          changeNote(mutator => {
            mutator.pinned = !note.pinned;
          }),
      });

      options.push({
        text: note.archived ? 'Unarchive' : 'Archive',
        key: 'archive',
        callback: () => {
          changeNote(mutator => {
            mutator.archived = !note.archived;
          });
        },
      });

      options.push({
        text: note.locked ? 'Unlock' : 'Lock',
        key: 'lock',
        callback: () =>
          changeNote(mutator => {
            mutator.locked = !note.locked;
          }),
      });

      options.push({
        text: note.protected ? 'Unprotect' : 'Protect',
        key: 'protect',
        callback: () =>
          changeNote(mutator => {
            mutator.protected = !note.protected;
          }),
      });

      if (!note.trashed) {
        options.push({
          text: 'Move to Trash',
          key: 'trash',
          destructive: true,
          callback: async () => {
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
        });
      } else {
        options = options.concat([
          {
            text: 'Restore',
            key: 'restore-note',
            callback: () => {
              changeNote(mutator => {
                mutator.trashed = false;
              });
            },
          },
          {
            text: 'Delete Permanently',
            key: 'delete-forever',
            destructive: true,
            callback: async () => {
              const title = `Delete ${note.safeTitle()}`;
              const message =
                'Are you sure you want to permanently delete this nite}?';
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
              }
            },
          },
        ]);
      }
      showActionSheet(
        note.safeTitle(),
        options,
        undefined,
        elementRef.current ?? undefined
      );
    }
  };

  const padding = 14;
  const showPreview =
    // !this.state.options.hidePreviews &&
    !note.protected && !note.hidePreview;
  const hasPlainPreview =
    !isNullOrUndefined(note.preview_plain) && note.preview_plain.length > 0;
  // const showTagsString =
  //   props.renderTags &&
  //   // !this.state.options.hideTags &&
  //   note.tags.length > 0 &&
  //   !note.protected;
  return (
    <TouchableContainer
      onPress={_onPress}
      onPressIn={_onPressIn}
      onPressOut={_onPressOut}
      onLongPress={onLongPress}
    >
      <Container ref={elementRef} selected={highlight} padding={padding}>
        {note.deleted && <DeletedText>Deleting...</DeletedText>}

        <NoteCellFlags note={note} highlight={highlight} />

        {note.errorDecrypting && (
          <NoteText selected={highlight} numberOfLines={2}>
            {'Please sign in to restore your decryption keys and notes.'}
          </NoteText>
        )}

        {note.safeTitle().length > 0 && (
          <TitleText selected={highlight}>{note.title}</TitleText>
        )}

        {hasPlainPreview && showPreview && (
          <NoteText selected={highlight} numberOfLines={2}>
            {note.preview_plain}
          </NoteText>
        )}

        {!hasPlainPreview && showPreview && note.safeText().length > 0 && (
          <NoteText selected={highlight} numberOfLines={2}>
            {note.text}
          </NoteText>
        )}

        {true && (
          <DateText numberOfLines={1} selected={highlight}>
            {sortType === 'client_updated_at'
              ? 'Modified ' + note.updatedAtString
              : note.createdAtString}
          </DateText>
        )}

        {false && (
          <TagsContainter>
            <TagText numberOfLines={1} selected={highlight}>
              {tagsString}
            </TagText>
          </TagsContainter>
        )}

        {/* {this.state.actionSheet && this.state.actionSheet} */}
      </Container>
    </TouchableContainer>
  );
};

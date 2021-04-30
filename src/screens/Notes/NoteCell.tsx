import {
  useChangeNote,
  useDeleteNoteWithPrivileges,
  useProtectOrUnprotectNote,
} from '@Lib/snjs_helper_hooks';
import { ApplicationContext } from '@Root/ApplicationContext';
import { CollectionSort, isNullOrUndefined, SNNote } from '@standardnotes/snjs';
import {
  CustomActionSheetOption,
  useCustomActionSheet,
} from '@Style/custom_action_sheet';
import React, { useContext, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import {
  Container,
  DeletedText,
  DetailsText,
  NoteText,
  TitleText,
  TouchableContainer,
} from './NoteCell.styled';
import { NoteCellFlags } from './NoteCellFlags';

type Props = {
  note: SNNote;
  highlighted?: boolean;
  onPressItem: (noteUuid: SNNote['uuid']) => void;
  hideDates: boolean;
  hidePreviews: boolean;
  sortType: CollectionSort;
};

export const NoteCell = ({
  note,
  onPressItem,
  highlighted,
  sortType,
  hideDates,
  hidePreviews,
}: Props) => {
  // Context
  const application = useContext(ApplicationContext);

  const [changeNote] = useChangeNote(note);
  const [protectOrUnprotectNote] = useProtectOrUnprotectNote(note);

  // State
  const [selected, setSelected] = useState(false);

  // Ref
  const selectionTimeout = useRef<number>();
  const elementRef = useRef<View>(null);

  const { showActionSheet } = useCustomActionSheet();

  const [deleteNote] = useDeleteNoteWithPrivileges(
    note,
    async () => {
      await application?.deleteItem(note);
    },
    () => {
      changeNote(mutator => {
        mutator.trashed = true;
      });
    },
    undefined
  );

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

  const onLongPress = () => {
    if (note.errorDecrypting) {
      return;
    }

    if (note.protected) {
      showActionSheet(
        note.safeTitle(),
        [
          {
            text: 'Note Protected',
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
          if (note.locked) {
            application?.alertService.alert(
              `This note has editing disabled. If you'd like to ${
                note.archived ? 'unarchive' : 'archive'
              } it, enable editing on it, and try again.`
            );
            return;
          }

          changeNote(mutator => {
            mutator.archived = !note.archived;
          });
        },
      });

      options.push({
        text: note.locked ? 'Enable Editing' : 'Prevent Editing',
        key: 'lock',
        callback: () =>
          changeNote(mutator => {
            mutator.locked = !note.locked;
          }),
      });

      options.push({
        text: note.protected ? 'Unprotect' : 'Protect',
        key: 'protect',
        callback: async () => await protectOrUnprotectNote(),
      });

      if (!note.trashed) {
        options.push({
          text: 'Move to Trash',
          key: 'trash',
          destructive: true,
          callback: async () => deleteNote(false),
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
            callback: async () => deleteNote(true),
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
  const showPreview = !hidePreviews && !note.protected && !note.hidePreview;
  const hasPlainPreview =
    !isNullOrUndefined(note.preview_plain) && note.preview_plain.length > 0;
  const showDetails = !note.errorDecrypting && (!hideDates || note.protected);

  return (
    <TouchableContainer
      onPress={_onPress}
      onPressIn={_onPressIn}
      onPressOut={_onPressOut}
      onLongPress={onLongPress}
    >
      <Container ref={elementRef as any} selected={highlight} padding={padding}>
        {note.deleted && <DeletedText>Deleting...</DeletedText>}

        <NoteCellFlags note={note} highlight={highlight} />

        {note.errorDecrypting && !note.waitingForKey && (
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

        {showDetails && (
          <DetailsText
            numberOfLines={1}
            selected={highlight}
            first={!note.title}
          >
            {note.protected && (
              <Text>
                Protected
                {!hideDates && ' • '}
              </Text>
            )}
            {!hideDates && (
              <Text>
                {sortType === CollectionSort.UpdatedAt
                  ? 'Modified ' + note.updatedAtString
                  : note.createdAtString}
              </Text>
            )}
          </DetailsText>
        )}
      </Container>
    </TouchableContainer>
  );
};

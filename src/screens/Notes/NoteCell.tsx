import { IconType } from '@Components/Icon';
import { ApplicationState } from '@Lib/application_state';
import {
  useChangeNote,
  useDeleteNoteWithPrivileges,
  useProtectOrUnprotectNote,
} from '@Lib/snjs_helper_hooks';
import { ApplicationContext } from '@Root/ApplicationContext';
import {
  CollectionSort,
  FeatureIdentifier,
  isNullOrUndefined,
  sanitizeHtmlString,
  SNNote,
} from '@standardnotes/snjs';
import {
  CustomActionSheetOption,
  useCustomActionSheet,
} from '@Style/custom_action_sheet';
import { ThemeServiceContext } from '@Style/theme_service';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
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

type NoteFlag = {
  text: string;
  class: 'Info' | 'Neutral' | 'Warning' | 'Success' | 'Danger';
};

const flagsForNote = (note: SNNote) => {
  const flags = [] as NoteFlag[];
  if (note.conflictOf) {
    flags.push({
      text: 'Conflicted Copy',
      class: 'Danger',
    });
  }
  if (note.errorDecrypting) {
    if (note.waitingForKey) {
      flags.push({
        text: 'Waiting For Keys',
        class: 'Info',
      });
    } else {
      flags.push({
        text: 'Missing Keys',
        class: 'Danger',
      });
    }
  }
  if (note.deleted) {
    flags.push({
      text: 'Deletion Pending Sync',
      class: 'Danger',
    });
  }
  return flags;
};

export const getIconForEditor = (
  identifier: FeatureIdentifier | undefined
): [IconType, number] => {
  switch (identifier) {
    case FeatureIdentifier.BoldEditor:
    case FeatureIdentifier.PlusEditor:
      return ['rich-text', 1];
    case FeatureIdentifier.MarkdownBasicEditor:
    case FeatureIdentifier.MarkdownMathEditor:
    case FeatureIdentifier.MarkdownMinimistEditor:
    case FeatureIdentifier.MarkdownProEditor:
      return ['markdown', 2];
    case FeatureIdentifier.TokenVaultEditor:
      return ['authenticator', 6];
    case FeatureIdentifier.SheetsEditor:
      return ['spreadsheets', 5];
    case FeatureIdentifier.TaskEditor:
      return ['tasks', 3];
    case FeatureIdentifier.CodeEditor:
      return ['code', 4];
    default:
      return ['plain-text', 1];
  }
};

const tagsForNote = (note: SNNote, appState: ApplicationState): string[] => {
  /* if (hideTags) {
    return [];
  } */
  const selectedTag = appState.selectedTag;
  if (!selectedTag) {
    return [];
  }
  const tags = appState.getNoteTags(note);
  if (!selectedTag.isSmartTag && tags.length === 1) {
    return [];
  }
  return tags.map(tag => tag.title);
};

export const NoteCell = ({
  note,
  onPressItem,
  highlighted,
  sortType,
  hideDates,
  hidePreviews,
}: Props) => {
  const themeService = useContext(ThemeServiceContext);
  const application = useContext(ApplicationContext);
  const flags = flagsForNote(note);
  const showModifiedDate = sortType === CollectionSort.UpdatedAt;
  //const editorForNote = application?.componentManager.editorForNote(note);
  //const [icon, tint] = getIconForEditor(editorForNote?.identifier);
  const [styles, setStyles] = useState<StyleSheet.NamedStyles<any>>();
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (application) {
      setTags(tagsForNote(note, application.getAppState()));
    }
  }, [application, note]);

  useEffect(() => {
    if (themeService?.variables) {
      setStyles(
        StyleSheet.create({
          noteItem: {
            flexShrink: 1,
            flexDirection: 'row',
            alignItems: 'stretch',
            ...Platform.select({
              web: {
                cursor: 'pointer',
              },
              default: {},
            }),
          },
          noteItemSelected: {
            ...Platform.select({
              web: {
                backgroundColor: 'var(--sn-stylekit-grey-5)',
                borderLeft: '2px solid var(--sn-stylekit-info-color)',
              },
              default: {
                backgroundColor:
                  themeService?.variables?.stylekitBackgroundColor ?? '#ffffff',
              },
            }),
          },
          icon: {
            alignItems: 'center',
            justifyContent: 'space-between',
            ...Platform.select({
              web: {
                padding: '0.9rem',
                paddingRight: '0.625rem',
              },
              default: {
                padding: 14.4,
                paddingRight: 10,
              },
            }),
          },
          meta: {
            flexShrink: 1,
            width: '100%',
            paddingLeft: 0,
            ...Platform.select({
              web: {
                padding: '0.9rem',
                borderBottom: '1px solid var(--sn-stylekit-border-color)',
              },
              default: {
                padding: 14.4,
                borderBottomWidth: 1,
                borderStyle: 'solid',
                borderBottomColor: themeService.variables.stylekitBorderColor,
              },
            }),
          },
          nameContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          tagsContainer: {
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            ...Platform.select({
              web: {
                gap: '.5rem',
                fontSize: '0.725rem',
                marginTop: '0.325rem',
              },
              default: {
                fontSize: 11.6,
                marginTop: 5.2,
              },
            }),
          },
          tag: {
            flexDirection: 'row',
            alignItems: 'center',
            ...Platform.select({
              web: {
                display: 'inline-flex',
                borderRadius: '0.125rem',
                backgroundColor: 'var(--sn-stylekit-grey-4-opacity-variant)',
                paddingTop: '0.25rem',
                paddingBottom: '0.25rem',
                paddingLeft: '0.325rem',
                paddingRight: '0.375rem',
              },
              default: {
                backgroundColor:
                  themeService.variables.stylekitGrey4OpacityVariant,
                paddingTop: 4,
                paddingBottom: 4,
                paddingLeft: 5.2,
                paddingRight: 6,
                marginRight: 10,
                marginBottom: 4,
                borderRadius: 2,
              },
            }),
          },
          tagLabel: {
            ...Platform.select({
              web: {
                color: 'var(--sn-stylekit-foreground-color)',
              },
              default: {
                color: themeService.variables.stylekitForegroundColor,
              },
            }),
          },
          title: {
            fontWeight: '600',
            overflow: 'hidden',
            ...Platform.select({
              web: {
                lineHeight: 1.3,
                fontFamily: 'var(--sn-stylekit-sans-serif-font)',
                display: 'inline-flex',
                fontSize: '1rem',
                textOverflow: 'ellipsis',
                color: 'var(--sn-stylekit-foreground-color)',
              },
              default: {
                fontSize: 16,
                lineHeight: 20.8,
                color: themeService.variables.stylekitForegroundColor,
              },
            }),
          },
          extraInfo: {
            opacity: 0.5,
            fontFamily: 'var(--sn-stylekit-sans-serif-font)',
            ...Platform.select({
              web: {
                fontSize: '0.75rem',
                lineHeight: 1.4,
                color: 'var(--sn-stylekit-foreground-color)',
                marginTop: '0.25rem',
              },
              default: {
                fontSize: 12,
                lineHeight: 15.6,
                color: themeService.variables.stylekitForegroundColor,
                marginTop: 4,
              },
            }),
          },
          flagIcons: {
            flexDirection: 'row',
          },
          flagIcon: {
            ...Platform.select({
              web: {
                marginLeft: '0.375rem',
              },
              default: {
                marginLeft: 6,
              },
            }),
          },
          noteFlags: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            ...Platform.select({
              web: {
                marginTop: '0.25rem',
              },
              default: {
                marginTop: 4,
              },
            }),
          },
          noteFlag: {
            padding: 4,
            paddingLeft: 6,
            paddingRight: 6,
            marginRight: 4,
            marginTop: 4,
            fontWeight: 'bold',
            textAlign: 'center',
            fontFamily: 'var(--sn-stylekit-sans-serif-font)',
            ...Platform.select({
              web: {
                display: 'inline-flex',
                fontSize: '1rem',
                textOverflow: 'ellipsis',
                borderRadius: 'var(--sn-stylekit-general-border-radius)',
              },
              default: {
                fontSize: 16,
                borderRadius: 1,
              },
            }),
          },
          noteFlagInfo: {
            ...Platform.select({
              web: {
                backgroundColor: 'var(--sn-stylekit-info-color)',
                color: 'var(--sn-stylekit-info-contrast-color)',
              },
              default: {
                backgroundColor: themeService.variables.stylekitInfoColor,
                color: themeService.variables.stylekitInfoContrastColor,
              },
            }),
          },
          noteFlagSuccess: {
            ...Platform.select({
              web: {
                backgroundColor: 'var(--sn-stylekit-success-color)',
                color: 'var(--sn-stylekit-success-contrast-color)',
              },
              default: {
                backgroundColor: themeService.variables.stylekitSuccessColor,
                color: themeService.variables.stylekitSuccessContrastColor,
              },
            }),
          },
          noteFlagWarning: {
            ...Platform.select({
              web: {
                backgroundColor: 'var(--sn-stylekit-warning-color)',
                color: 'var(--sn-stylekit-warning-contrast-color)',
              },
              default: {
                backgroundColor: themeService.variables.stylekitWarningColor,
                color: themeService.variables.stylekitWarningContrastColor,
              },
            }),
          },
          noteFlagNeutral: {
            ...Platform.select({
              web: {
                backgroundColor: 'var(--sn-stylekit-neutral-color)',
                color: 'var(--sn-stylekit-neutral-contrast-color)',
              },
              default: {
                backgroundColor: themeService.variables.stylekitNeutralColor,
                color: themeService.variables.stylekitNeutralContrastColor,
              },
            }),
          },
          noteFlagDanger: {
            ...Platform.select({
              web: {
                backgroundColor: 'var(--sn-stylekit-danger-color)',
                color: 'var(--sn-stylekit-danger-contrast-color)',
              },
              default: {
                backgroundColor: themeService.variables.stylekitDangerColor,
                color: themeService.variables.stylekitDangerContrastColor,
              },
            }),
          },
          textPreview: {
            fontFamily: 'var(--sn-stylekit-sans-serif-font)',
            overflow: 'hidden',
            ...Platform.select({
              web: {
                lineHeight: 1.3,
                color: 'var(--sn-stylekit-foreground-color)',
                '-webkit-box-orient': 'vertical',
                '-webkit-line-clamp': '1',
                fontSize: 'var(--sn-stylekit-font-size-h3)',
                display: '-webkit-box',
                marginTop: '0.15rem',
              },
              default: {
                color: themeService.variables.stylekitForegroundColor,
                lineHeight: 18.59,
                fontSize: 14.3,
                marginTop: 2.4,
              },
            }),
          },
        })
      );
    }
  }, [themeService?.variables]);

  return styles ? (
    <View
      style={[styles.noteItem, highlighted && styles.noteItemSelected]}
      //id={`note-${note.uuid}`}
      //onClick={onClick}
      //onContextMenu={onContextMenu}
      //className={'note-item'}
    >
      <View style={styles.icon}>
        {/* <Icon type={icon} className={`color-accessory-tint-${tint}`} /> */}
      </View>
      <View style={styles.meta}>
        <View style={styles.nameContainer}>
          <Text style={styles.title}>{note.title}</Text>
          <View style={styles.flagIcons}>
            {note.locked && (
              <View>
                {/* <Icon
                  type="pencil-off"
                  className="sn-icon--small color-info"
                  ariaHidden={true}
                /> */}
              </View>
            )}
            {note.trashed && (
              <View style={styles.flagIcon}>
                {/* <Icon
                  type="trash-filled"
                  className="sn-icon--small color-danger"
                  ariaHidden={true}
                /> */}
              </View>
            )}
            {note.archived && (
              <View style={styles.flagIcon}>
                {/* <Icon
                  type="archive"
                  className="sn-icon--mid color-accessory-tint-3"
                  ariaHidden={true}
                /> */}
              </View>
            )}
            {note.pinned && (
              <View style={styles.flagIcon}>
                {/* <Icon
                  type="pin-filled"
                  className="sn-icon--small color-info"
                  ariaHidden={true}
                /> */}
              </View>
            )}
          </View>
        </View>
        {!hidePreviews && !note.hidePreview && !note.protected ? (
          <View>
            {note.preview_html && Platform.OS === 'web' ? (
              <div
                className="html-preview"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtmlString(note.preview_html),
                }}
              />
            ) : null}
            {!note.preview_html && note.preview_plain ? (
              <Text
                numberOfLines={1}
                ellipsizeMode={'tail'}
                style={styles.textPreview}
              >
                {note.preview_plain}
              </Text>
            ) : null}
            {!note.preview_html && !note.preview_plain && note.text ? (
              <Text style={styles.textPreview}>{note.text}</Text>
            ) : null}
          </View>
        ) : null}
        {!hideDates || note.protected ? (
          <Text style={styles.extraInfo}>
            {note.protected && `Protected${hideDates ? '' : ' • '}`}
            {!hideDates &&
              showModifiedDate &&
              `Modified ${note.updatedAtString || 'Now'}`}
            {!hideDates && !showModifiedDate
              ? note.createdAtString || 'Now'
              : null}
          </Text>
        ) : null}
        {tags.length ? (
          <View style={styles.tagsContainer}>
            {tags.map(tag => (
              <View style={styles.tag} key={tag + Math.random()}>
                {/* <Icon
                  type="hashtag"
                  className="sn-icon--small color-grey-1 mr-1"
                /> */}
                <Text style={styles.tagLabel}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {flags.length ? (
          <View style={styles.noteFlags}>
            {flags.map(flag => (
              <Text style={[styles.noteFlag, styles[`noteFlag${flag.class}`]]}>
                {flag.text}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  ) : null;
};

export const _NoteCell = ({
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
    selectionTimeout.current = setTimeout(() => {
      setSelected(false);
      onPressItem(note.uuid);
    }, 25);
  };

  const _onPressIn = () => {
    setSelected(true);
  };

  const _onPressOut = () => {
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
        text: note.locked ? 'Enable editing' : 'Prevent editing',
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
            text: 'Delete permanently',
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
      delayPressIn={150}
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

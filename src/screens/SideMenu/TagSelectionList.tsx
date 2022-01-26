import { useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStackNavigationProp } from '@Root/AppStack';
import { SCREEN_COMPOSE, SCREEN_INPUT_MODAL_TAG } from '@Screens/screens';
import {
  ButtonType,
  CollectionSort,
  ContentType,
  SNSmartTag,
  SNTag,
  UuidString,
} from '@standardnotes/snjs';
import { useCustomActionSheet } from '@Style/custom_action_sheet';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import { SideMenuCell } from './SideMenuCell';
import { TagDraggingInstructions } from './TagDraggingInstruction';
import { EmptyPlaceholder } from './TagSelectionList.styled';

type Props = {
  contentType: ContentType.Tag | ContentType.SmartTag;
  onTagSelect: (tag: SNTag | SNSmartTag) => void;
  selectedTags: SNTag[] | SNSmartTag[];
  emptyPlaceholder?: string;
  hasBottomPadding?: boolean;
};

export const TagSelectionList = React.memo(
  ({
    contentType,
    onTagSelect,
    selectedTags,
    emptyPlaceholder,
    hasBottomPadding,
  }: Props) => {
    // Context
    const application = useContext(ApplicationContext);
    const navigation = useNavigation<
      AppStackNavigationProp<typeof SCREEN_COMPOSE>['navigation']
    >();
    const { showActionSheet } = useCustomActionSheet();

    // State
    const [tags, setTags] = useState<SNTag[] | SNSmartTag[]>(() =>
      contentType === ContentType.SmartTag ? application!.getSmartTags() : []
    );
    const displayOptionsSet = useRef<boolean>(false);

    const reloadTags = useCallback(() => {
      if (contentType === ContentType.SmartTag) {
        setTags(application!.getSmartTags());
      } else {
        setTags(application!.getDisplayableItems(contentType) as SNTag[]);
      }
    }, [application, contentType]);

    const streamTags = useCallback(
      () =>
        application!.streamItems(contentType, items => {
          reloadTags();
          if (application?.getAppState().selectedTag) {
            /** If the selected tag has been deleted, revert to All view. */
            const matchingTag = items.find(tag => {
              return tag.uuid === application?.getAppState().selectedTag?.uuid;
            }) as SNTag;
            if (matchingTag) {
              if (matchingTag.deleted) {
                application
                  .getAppState()
                  .setSelectedTag(application!.getSmartTags()[0], true);
              }
            }
          }
        }),
      [application, contentType, reloadTags]
    );

    useEffect(() => {
      if (!displayOptionsSet.current) {
        application!.setDisplayOptions(
          contentType,
          CollectionSort.Title,
          'dsc'
        );
        displayOptionsSet.current = true;
      }

      const removeStreamTags = streamTags();

      return removeStreamTags;
    }, [application, contentType, streamTags]);

    // Tag Selection and edition
    const [dragging, setDragging] = useState<UuidString | null>(null);
    const upToDateDraggingTag = dragging
      ? (application?.findItem(dragging) as SNTag)
      : null;

    const onTagLongPress = useCallback(
      (tag: SNTag | SNSmartTag) => {
        showActionSheet(tag.title, [
          {
            text: 'Rename',
            callback: () =>
              navigation.navigate(SCREEN_INPUT_MODAL_TAG, {
                tagUuid: tag.uuid,
              }),
          },
          {
            text: 'Move',
            callback: () => setDragging(tag.uuid),
          },
          {
            text: 'Delete',
            destructive: true,
            callback: async () => {
              const confirmed = await application?.alertService.confirm(
                'Are you sure you want to delete this tag? Deleting a tag will not delete its notes.',
                undefined,
                'Delete',
                ButtonType.Danger
              );
              if (confirmed) {
                await application!.deleteItem(tag);
              }
            },
          },
        ]);
      },
      [showActionSheet, setDragging, navigation, application]
    );

    const onTagPress = useCallback(
      (tag: SNTag | SNSmartTag) => {
        if (!upToDateDraggingTag) {
          return onTagSelect(tag);
        } else {
          // TODO: use Uuids
          // TODO: use a global tap to deselect?

          const isValidDroptarget = application?.isValidTagParent(
            tag.uuid,
            upToDateDraggingTag.uuid
          );

          if (isValidDroptarget) {
            application?.setTagParent(tag, upToDateDraggingTag);
            setDragging(null);
          }
        }
      },
      [application, upToDateDraggingTag, setDragging, onTagSelect]
    );

    // Nesting
    const isRootTag = (tag: SNTag | SNSmartTag): boolean =>
      !(application?.getTagParent(tag) || false);

    const isRegularTag = (tag: SNTag | SNSmartTag): boolean =>
      tag.content_type === ContentType.Tag;

    const showFolders = contentType === ContentType.Tag;
    const renderedTags = showFolders ? tags.filter(isRootTag) : tags;

    const renderItem: ListRenderItem<SNTag | SNSmartTag> = ({ item }) => {
      if (!application) {
        return null;
      }

      let title = item.deleted ? 'Deleting...' : item.title;
      if (item.errorDecrypting) {
        title = 'Unable to Decrypt';
      }

      let children: (SNTag | SNSmartTag)[] = [];

      if (showFolders && isRegularTag(item)) {
        const rawChildren = application
          .getTagChildren(item)
          .map(tag => tag.uuid);
        children = tags.filter(tag => rawChildren.includes(tag.uuid));
      }

      const isSelected = selectedTags.some(
        selectedTag => selectedTag.uuid === item.uuid
      );

      const isDragging = !!dragging;

      const isBeingDragged = item.uuid === dragging;

      const isValidDroptarget =
        dragging && application.isValidTagParent(item.uuid, dragging);

      const userIsEncouragedToTap = isDragging
        ? !isBeingDragged && isValidDroptarget
        : true;

      return (
        <>
          <SideMenuCell
            onSelect={() => onTagPress(item)}
            onLongPress={() => onTagLongPress(item)}
            text={title}
            iconDesc={{
              side: 'left',
              type: 'ascii',
              value: '#',
            }}
            dimmed={!userIsEncouragedToTap}
            key={item.uuid}
            selected={isSelected}
          />
          {children && (
            <FlatList
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                paddingLeft: 15,
              }}
              initialNumToRender={10}
              windowSize={10}
              maxToRenderPerBatch={10}
              data={children}
              keyExtractor={childTag => childTag.uuid}
              renderItem={renderItem}
            />
          )}
        </>
      );
    };

    const onUnset = useCallback(() => {
      if (!upToDateDraggingTag) {
        return;
      }

      application?.unsetTagParent(upToDateDraggingTag);
      setDragging(null);
    }, [application, upToDateDraggingTag]);

    return (
      <>
        {upToDateDraggingTag && (
          <TagDraggingInstructions
            onUnset={onUnset}
            dragging={upToDateDraggingTag}
          />
        )}
        <FlatList
          // eslint-disable-next-line react-native/no-inline-styles
          style={{ paddingBottom: hasBottomPadding ? 30 : 0 }}
          initialNumToRender={10}
          windowSize={10}
          maxToRenderPerBatch={10}
          data={renderedTags}
          keyExtractor={item => item.uuid}
          renderItem={renderItem}
        />
        {tags.length === 0 && (
          <EmptyPlaceholder>{emptyPlaceholder}</EmptyPlaceholder>
        )}
      </>
    );
  }
);

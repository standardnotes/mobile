import { useNavigation } from '@react-navigation/native';
import { AppStackNavigationProp } from '@Root/AppStack';
import { useSafeApplicationContext } from '@Root/hooks/useSafeApplicationContext';
import { SCREEN_COMPOSE, SCREEN_INPUT_MODAL_TAG } from '@Screens/screens';
import { SideMenuOptionIconDescriptionType } from '@Screens/SideMenu/SideMenuSection';
import {
  ButtonType,
  CollectionSort,
  ContentType,
  SmartView,
  SNTag,
} from '@standardnotes/snjs';
import { useCustomActionSheet } from '@Style/custom_action_sheet';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import { SideMenuCell } from './SideMenuCell';
import { EmptyPlaceholder } from './TagSelectionList.styled';

type Props = {
  contentType: ContentType.Tag | ContentType.SmartView;
  onTagSelect: (tag: SNTag | SmartView) => void;
  selectedTags: SNTag[] | SmartView[];
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
    const application = useSafeApplicationContext();
    const navigation =
      useNavigation<
        AppStackNavigationProp<typeof SCREEN_COMPOSE>['navigation']
      >();
    const { showActionSheet } = useCustomActionSheet();

    // State
    const [tags, setTags] = useState<SNTag[] | SmartView[]>(() =>
      contentType === ContentType.SmartView
        ? application!.items.getSmartViews()
        : []
    );
    const displayOptionsSet = useRef<boolean>(false);

    const reloadTags = useCallback(() => {
      if (contentType === ContentType.SmartView) {
        setTags(application!.items.getSmartViews());
      } else {
        setTags(application!.items.getDisplayableItems(contentType) as SNTag[]);
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
                  .setSelectedTag(application!.items.getSmartViews()[0], true);
              }
            }
          }
        }),
      [application, contentType, reloadTags]
    );

    useEffect(() => {
      if (!displayOptionsSet.current) {
        application!.items.setDisplayOptions(
          contentType,
          CollectionSort.Title,
          'dsc'
        );
        displayOptionsSet.current = true;
      }

      const removeStreamTags = streamTags();

      return removeStreamTags;
    }, [application, contentType, streamTags]);

    const onTagLongPress = (tag: SNTag | SmartView) => {
      showActionSheet(tag.title, [
        {
          text: 'Rename',
          callback: () =>
            navigation.navigate(SCREEN_INPUT_MODAL_TAG, { tagUuid: tag.uuid }),
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
              await application!.mutator.deleteItem(tag);
            }
          },
        },
      ]);
    };

    const isRootTag = (tag: SNTag | SmartView): boolean =>
      tag instanceof SmartView || !application.items.getTagParent(tag.uuid);

    const showFolders = contentType === ContentType.Tag;
    const renderedTags = showFolders
      ? (tags as SNTag[]).filter(isRootTag)
      : tags;

    const renderItem: ListRenderItem<SNTag | SmartView> = ({ item }) => {
      let title = item.deleted ? 'Deleting...' : item.title;
      if (item.errorDecrypting) {
        title = 'Unable to Decrypt';
      }

      let children: SNTag[] = [];

      if (showFolders && item instanceof SNTag) {
        const rawChildren = application.items
          .getTagChildren(item.uuid)
          .map(tag => tag.uuid);
        children = (tags as SNTag[]).filter((tag: SNTag) =>
          rawChildren.includes(tag.uuid)
        );
      }

      const isSelected = selectedTags.some(
        (selectedTag: SNTag | SmartView) => selectedTag.uuid === item.uuid
      );

      return (
        <>
          <SideMenuCell
            onSelect={() => onTagSelect(item)}
            onLongPress={() => onTagLongPress(item)}
            text={title}
            iconDesc={{
              side: 'left',
              type: SideMenuOptionIconDescriptionType.Ascii,
              value: '#',
            }}
            key={item.uuid}
            selected={isSelected}
          />
          {children && (
            <FlatList
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                paddingLeft: 25,
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

    return (
      <>
        <FlatList
          // eslint-disable-next-line react-native/no-inline-styles
          style={{ paddingBottom: hasBottomPadding ? 30 : 0 }}
          initialNumToRender={10}
          windowSize={10}
          maxToRenderPerBatch={10}
          data={renderedTags as SNTag[]}
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

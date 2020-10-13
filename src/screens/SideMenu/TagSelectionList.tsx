import { useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStackNavigationProp } from '@Root/AppStack';
import { SCREEN_COMPOSE, SCREEN_INPUT_MODAL_TAG } from '@Screens/screens';
import { useCustomActionSheet } from '@Style/custom_action_sheet';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import {
  ButtonType,
  CollectionSort,
  ContentType,
  SNSmartTag,
  SNTag,
} from 'snjs';
import { SideMenuCell } from './SideMenuCell';
import { EmptyPlaceholder } from './TagSelectionList.styled';

type Props = {
  contentType: ContentType.Tag | ContentType.SmartTag;
  onTagSelect: (tag: SNTag | SNSmartTag) => void;
  selectedTags: SNTag[] | SNSmartTag[];
  emptyPlaceholder?: string;
  hasBottomPadding?: boolean;
};

export const TagSelectionList = (props: Props): JSX.Element => {
  // Context
  const application = useContext(ApplicationContext);
  const navigation = useNavigation<
    AppStackNavigationProp<typeof SCREEN_COMPOSE>['navigation']
  >();
  const { showActionSheet } = useCustomActionSheet();

  // State
  const [tags, setTags] = useState<SNTag[] | SNSmartTag[]>(() =>
    props.contentType === ContentType.SmartTag
      ? application!.getSmartTags()
      : []
  );
  const displayOptionsSet = useRef<boolean>(false);

  const reloadTags = useCallback(() => {
    if (props.contentType === ContentType.SmartTag) {
      setTags(application!.getSmartTags());
    } else {
      setTags(application!.getDisplayableItems(props.contentType) as SNTag[]);
    }
  }, [application, props.contentType]);

  const streamTags = useCallback(
    () =>
      application!.streamItems(props.contentType, items => {
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
                .setSelectedTag(application!.getSmartTags()[0]);
            }
          }
        }
      }),
    [application, props.contentType, reloadTags]
  );

  useEffect(() => {
    if (!displayOptionsSet.current) {
      application!.setDisplayOptions(
        ContentType.Tag,
        CollectionSort.Title,
        'dsc'
      );
      displayOptionsSet.current = true;
    }

    const removeStreamTags = streamTags();

    return removeStreamTags;
  }, [application, streamTags]);

  const onTagLongPress = (tag: SNTag | SNSmartTag) => {
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
            ButtonType.Danger,
            'Cancel'
          );
          if (confirmed) {
            await application!.deleteItem(tag);
          }
        },
      },
    ]);
  };

  const rendetItem: ListRenderItem<SNTag | SNSmartTag> = ({ item }) => {
    let title = item.deleted ? 'Deleting...' : item.title;
    if (item.errorDecrypting) {
      title = 'Unable to Decrypt';
    }

    return (
      <SideMenuCell
        onSelect={() => {
          props.onTagSelect(item);
        }}
        onLongPress={() => onTagLongPress(item)}
        text={title}
        iconDesc={{
          side: 'left',
          type: 'ascii',
          value: '#',
        }}
        key={item.uuid}
        selected={
          props.selectedTags.findIndex(
            selectedTag => selectedTag.uuid === item.uuid
          ) > -1
        }
      />
    );
  };

  return (
    <>
      <FlatList
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ paddingBottom: props.hasBottomPadding ? 30 : 0 }}
        initialNumToRender={10}
        windowSize={10}
        maxToRenderPerBatch={10}
        data={tags}
        keyExtractor={item => item.uuid}
        renderItem={rendetItem}
      />

      {tags.length === 0 && (
        <EmptyPlaceholder>{props.emptyPlaceholder}</EmptyPlaceholder>
      )}
    </>
  );
};

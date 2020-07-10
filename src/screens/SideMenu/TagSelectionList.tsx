import { useNavigation } from '@react-navigation/native';
import { AppStackNavigationProp } from '@Root/App';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_COMPOSE, SCREEN_INPUT_MODAL_TAG } from '@Root/screens2/screens';
import { useCustomActionSheet } from '@Style/useCustomActionSheet';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import { ContentType, SNSmartTag, SNTag } from 'snjs';
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
  const application = useContext(ApplicationContext);
  const navigation = useNavigation<
    AppStackNavigationProp<typeof SCREEN_COMPOSE>['navigation']
  >();

  const { showActionSheet } = useCustomActionSheet();
  const [tags, setTags] = useState<SNTag[] | SNSmartTag[]>(() =>
    props.contentType === ContentType.SmartTag
      ? application!.getSmartTags()
      : []
  );

  const reloadTags = useCallback(() => {
    if (props.contentType === ContentType.SmartTag) {
      setTags(application!.getSmartTags());
    } else {
      setTags(
        application!
          .getItems(props.contentType)
          .sort((a, b) => a.title.localeCompare(b.title)) as SNTag[]
      );
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
    const removeStreamTags = streamTags();

    return removeStreamTags;
  }, [streamTags]);

  const onTagLongPress = (tag: SNTag | SNSmartTag) => {
    showActionSheet(tag.title, [
      {
        text: 'Rename',
        callback: () =>
          // @ts-expect-error
          navigation.navigate(SCREEN_INPUT_MODAL_TAG, { tagUuid: tag.uuid }),
      },
      {
        text: 'Delete',
        destructive: true,
        callback: async () => {
          await application!.deleteItem(tag);
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

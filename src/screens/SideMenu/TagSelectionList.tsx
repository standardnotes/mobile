import { ApplicationContext } from '@Root/ApplicationContext';
import { useCustomActionSheet } from '@Style/useCustomActionSheet';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import { ContentType, SNSmartTag, SNTag } from 'snjs';
import { SideMenuCell } from './SideMenuCell';
import { EmptyPlaceholder } from './TagSelectionList.styled';

type Props = {
  contentType: ContentType.Tag | ContentType.SmartTag;
  onTagSelect: (tag: SNTag | SNSmartTag) => void;
  selectedTag?: SNTag | SNSmartTag;
  emptyPlaceholder?: string;
  hasBottomPadding?: boolean;
};

export const TagSelectionList = (props: Props): JSX.Element => {
  const application = useContext(ApplicationContext);
  const { showActionSheet } = useCustomActionSheet();
  const [tags, setTags] = useState<SNTag[] | SNSmartTag[]>(() =>
    props.contentType === ContentType.SmartTag
      ? application!.getSmartTags()
      : []
  );
  const streamTags = useCallback(
    () =>
      application!.streamItems(props.contentType, items => {
        if (props.contentType === ContentType.SmartTag) {
          setTags(application!.getSmartTags().concat(items as SNSmartTag[]));
        } else {
          setTags(items as SNTag[]);
        }
      }),
    [props.contentType, application, setTags]
  );
  useEffect(() => {
    const removeStreamTags = streamTags();

    return removeStreamTags;
  }, [streamTags]);
  const onTagLongPress = (tag: SNTag | SNSmartTag) => {
    showActionSheet(tag.title, [
      {
        text: 'Rename',
        callback: () => {
          //   this.props.navigation.navigate(SCREEN_INPUT_MODAL, {
          //     title: 'Rename Tag',
          //     placeholder: 'Tag name',
          //     initialValue: tag.title,
          //     onSubmit: (text: string) => {
          //       if (tag) {
          //         tag.title = text; // Update the text on the tag to the input text
          //         tag.setDirty(true);
          //         Sync.get().sync();
          //         this.forceUpdate();
          //       }
          //     },
          //   });
        },
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
        selected={props.selectedTag?.uuid === item.uuid}
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
        extraData={
          /* Required to force list cells to update on selection change */
          props.selectedTag
        }
      />

      {tags.length === 0 && (
        <EmptyPlaceholder>{props.emptyPlaceholder}</EmptyPlaceholder>
      )}
    </>
  );
};

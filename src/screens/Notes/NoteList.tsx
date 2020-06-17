import React from 'react';
import {
  RefreshControl,
  FlatList,
  Platform,
  ListRenderItem,
  StyleSheet,
} from 'react-native';
import { SNNote, SNTag } from 'snjs';
import styled from 'styled-components/native';
import { NoteCell } from './NoteCell';

type Props = {
  onSearchChange: (text: string) => void;
  onSearchCancel: () => void;
  onPressItem: (item: SNNote) => void;
  selectedTags: SNTag[];
  selectedNoteId: string | null;
  sortType: string;
  decrypting: boolean;
  loading: boolean;
  hasRefreshControl: boolean;
  notes: SNNote[];
  refreshing: boolean;
  onRefresh: () => void;
};

const Container = styled.View`
  background-color: ${props => props.theme.stylekitBackgroundColor};
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  z-index: -1;
  position: absolute;
  height: 100%;
  width: 100%;
`;

const LoadingText = styled.Text`
  position: absolute;
  opacity: 0.5;
  color: ${props => props.theme.stylekitForegroundColor};
`;

// no support for generic types in Flatlist
const styles = StyleSheet.create({
  list: {
    height: '100%',
  },
});

export const NoteList = (props: Props): JSX.Element => {
  const renderItem: ListRenderItem<SNNote> | null | undefined = ({ item }) => {
    /**
     * On Android, only one tag is selected at a time. If it is selected, we
     * don't need to display the tags string above the note cell.
     */
    const selectedTags = props.selectedTags || [];
    const renderTags = Platform.OS === 'ios' || selectedTags.length === 0;
    // || !item.tags.includes(selectedTags[0]);

    return (
      <NoteCell
        note={item}
        onPressItem={props.onPressItem}
        // @ts-ignore TODO: not used props for extra data
        title={item.title}
        text={item.text}
        // tags={item.tags}
        // tagsString={item.tagsString()}
        sortType={props.sortType}
        renderTags={renderTags}
        // options={props.options}
        highlighted={item.uuid === props.selectedNoteId}
        // handleAction={props.handleAction}
        // @ts-ignore TODO: not used props for extra data
        pinned={item.pinned /* extraData */}
        deleted={item.deleted /* extraData */}
        archived={item.archived /* extraData */}
        locked={item.locked /* extraData */}
        protected={item?.protected /* extraData */}
        hidePreview={item?.hidePreview /* extraData */}
        conflictOf={item?.conflictOf /* extraData */}
      />
    );
  };
  let placeholderText = '';
  if (props.decrypting) {
    placeholderText = 'Decrypting notes...';
  } else if (props.loading) {
    placeholderText = 'Loading notes...';
  } else if (props.notes.length === 0) {
    placeholderText = 'No notes.';
  }
  return (
    <Container>
      {placeholderText.length > 0 && (
        <LoadingContainer>
          <LoadingText>{placeholderText}</LoadingText>
        </LoadingContainer>
      )}

      <FlatList
        style={styles.list}
        keyExtractor={item => item.uuid}
        initialNumToRender={6}
        windowSize={6}
        maxToRenderPerBatch={6}
        keyboardDismissMode={'interactive'}
        keyboardShouldPersistTaps={'always'}
        refreshControl={
          !props.hasRefreshControl ? undefined : (
            <RefreshControl
              refreshing={props.refreshing}
              onRefresh={props.onRefresh}
            />
          )
        }
        data={props.notes}
        renderItem={renderItem}
        // ListHeaderComponent={this.renderHeader}
      />
    </Container>
  );
};

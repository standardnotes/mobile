import { useSignedIn } from '@Lib/customHooks';
import { StyleKitContext } from '@Style/StyleKit';
import React, { useContext, useEffect, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  Platform,
  RefreshControl,
} from 'react-native';
import SearchBar from 'react-native-search-bar';
import { SNNote, SNTag } from 'snjs';
import { NoteCell } from './NoteCell';
import {
  Container,
  HeaderContainer,
  LoadingContainer,
  LoadingText,
  styles,
} from './NoteList.styled';
import { OfflineBanner } from './OfflineBanner';

type Props = {
  onSearchChange: (text: string) => void;
  onSearchCancel: () => void;
  onPressItem: (noteUuid: SNNote['uuid']) => void;
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

export const NoteList = (props: Props): JSX.Element => {
  // Context
  const signedIn = useSignedIn();
  const styleKit = useContext(StyleKitContext);

  // State
  const [searchText, setSearchText] = useState(' ');

  useEffect(() => {
    // Android workaound to fix clear search not working
    setSearchText('');
  }, []);

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
      <HeaderContainer>
        <SearchBar
          // ref="searchBar"
          keyboardAppearance={styleKit?.keyboardColorForActiveTheme()}
          placeholder="Search"
          text={searchText}
          onChangeText={() => {}}
          onSearchButtonPress={() => {}}
          onCancelButtonPress={() => {}}
        />
      </HeaderContainer>
      <FlatList
        style={styles.list}
        keyExtractor={item => item.uuid}
        initialNumToRender={6}
        windowSize={6}
        maxToRenderPerBatch={6}
        keyboardDismissMode={'interactive'}
        keyboardShouldPersistTaps={'never'}
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
        extraData={signedIn}
        ListHeaderComponent={() => (
          <HeaderContainer>{!signedIn && <OfflineBanner />}</HeaderContainer>
        )}
      />
    </Container>
  );
};

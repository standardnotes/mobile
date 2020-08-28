import { AppStateEventType } from '@Lib/ApplicationState';
import { useSignedIn } from '@Lib/snjsHooks';
import { useFocusEffect } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { StyleKitContext } from '@Style/StyleKit';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  ListRenderItem,
  Platform,
  RefreshControl,
} from 'react-native';
import IosSearchBar from 'react-native-search-bar';
import AndroidSearchBar from 'react-native-search-box';
import { CollectionSort, SNNote, SNTag } from 'snjs';
import { ThemeContext } from 'styled-components/native';
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
  searchText: string;
  onPressItem: (noteUuid: SNNote['uuid']) => void;
  selectedTags: SNTag[];
  selectedNoteId: string | null;
  sortType: CollectionSort;
  hideDates: boolean;
  hideTags: boolean;
  hidePreviews: boolean;
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
  const application = useContext(ApplicationContext);
  const styleKit = useContext(StyleKitContext);
  const theme = useContext(ThemeContext);

  // State
  const [searchText, setSearchText] = useState(' ');

  // Ref
  const searchBoxInputRef = useRef<IosSearchBar>(null);

  const dissmissKeybard = () => {
    searchBoxInputRef.current?.blur();
  };

  useEffect(() => {
    const unsubscribeStateEventObserver = application
      ?.getAppState()
      .addStateEventObserver(state => {
        if (state === AppStateEventType.DrawerOpen) {
          dissmissKeybard();
        }
      });

    return unsubscribeStateEventObserver;
  }, [application]);

  useEffect(() => {
    // Android workaound to fix clear search not working
    setSearchText('');
  }, []);

  useFocusEffect(
    useCallback(() => {
      return dissmissKeybard;
    }, [])
  );

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
        hideTags={props.hideTags}
        hideDates={props.hideDates}
        hidePreviews={props.hidePreviews}
        highlighted={item.uuid === props.selectedNoteId}
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
        {Platform.OS === 'ios' && (
          <IosSearchBar
            ref={searchBoxInputRef}
            keyboardAppearance={styleKit?.keyboardColorForActiveTheme()}
            placeholder="Search"
            text={searchText}
            hideBackground
            barTintColor={theme.stylekitBackgroundColor}
            textFieldBackgroundColor={theme.stylekitContrastBackgroundColor}
            textColor={theme.stylekitForegroundColor}
            onChangeText={props.onSearchChange}
            onSearchButtonPress={() => {
              searchBoxInputRef.current?.blur();
            }}
            onCancelButtonPress={() => {
              searchBoxInputRef.current?.blur();
              props.onSearchCancel();
            }}
          />
        )}
        {Platform.OS === 'android' && (
          <AndroidSearchBar
            onChangeText={props.onSearchChange}
            onCancel={props.onSearchCancel}
            onDelete={props.onSearchCancel}
            blurOnSubmit={true}
            backgroundColor={theme.stylekitBackgroundColor}
            titleCancelColor={theme.stylekitInfoColor}
            keyboardDismissMode={'interactive'}
            keyboardAppearance={styleKit?.keyboardColorForActiveTheme()}
            inputBorderRadius={4}
            tintColorSearch={theme.stylekitForegroundColor}
            inputStyle={[
              styles.androidSearch,
              {
                backgroundColor: theme.stylekitContrastBackgroundColor,
                // color: theme.stylekitForegroundColor,
              },
            ]}
          />
        )}
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
              tintColor={theme.stylekitContrastForegroundColor}
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

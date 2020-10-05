import { AppStateEventType } from '@Lib/application_state';
import { useSignedIn } from '@Lib/snjs_helper_hooks';
import { useFocusEffect } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ThemeServiceContext } from '@Style/theme_service';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IosSearchBar from 'react-native-search-bar';
import AndroidSearchBar from 'react-native-search-box';
import { CollectionSort, SNNote } from 'snjs';
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
  onPressItem: (note: SNNote) => void;
  selectedNoteId: string | undefined;
  sortType: CollectionSort;
  hideDates: boolean;
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
  const themeService = useContext(ThemeServiceContext);
  const theme = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

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
    /**
     * Android workaound to fix clear search not working
     */
    setSearchText('');
  }, []);

  useFocusEffect(
    useCallback(() => {
      return dissmissKeybard;
    }, [])
  );

  const renderItem: ListRenderItem<SNNote> | null | undefined = ({ item }) => {
    return (
      <NoteCell
        note={item}
        onPressItem={props.onPressItem}
        sortType={props.sortType}
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
            keyboardAppearance={themeService?.keyboardColorForActiveTheme()}
            placeholder="Search"
            text={searchText}
            hideBackground
            /**
             * keyboardColorForActiveTheme returns the same value as apperance
             */
            appearance={themeService?.keyboardColorForActiveTheme()}
            barTintColor={theme.stylekitInfoColor}
            textFieldBackgroundColor={theme.stylekitContrastBackgroundColor}
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
            keyboardAppearance={themeService?.keyboardColorForActiveTheme()}
            inputBorderRadius={4}
            tintColorSearch={theme.stylekitForegroundColor}
            inputStyle={[
              styles.androidSearch,
              {
                backgroundColor: theme.stylekitContrastBackgroundColor,
              },
            ]}
          />
        )}
      </HeaderContainer>
      <FlatList
        style={styles.list}
        keyExtractor={item => item.uuid}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
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

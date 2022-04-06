import { SearchBar } from '@Components/SearchBar';
import { SnIcon } from '@Components/SnIcon';
import { useNavigation } from '@react-navigation/native';
import { useFiles } from '@Root/hooks/useFiles';
import { ModalStackNavigationProp } from '@Root/ModalStack';
import { SCREEN_UPLOADED_FILES_LIST } from '@Screens/screens';
import { UploadedFileItem } from '@Screens/UploadedFilesList/UploadedFileItem';
import {
  HeaderTabItem,
  TabText,
  UploadFilesListContainer,
  useUploadedFilesListStyles,
} from '@Screens/UploadedFilesList/UploadedFilesList.styled';
import { SNFile } from '@standardnotes/snjs';
import { useCustomActionSheet } from '@Style/custom_action_sheet';
import { ICON_ATTACH } from '@Style/icons';
import { ThemeService } from '@Style/theme_service';
import React, {
  FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FlatList, ListRenderItem, Text, View } from 'react-native';
import FAB from 'react-native-fab';
import IosSearchBar from 'react-native-search-bar';
import AndroidSearchBar from 'react-native-search-box';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemeContext } from 'styled-components';

enum Tabs {
  AttachedFiles,
  AllFiles,
}

type Props = ModalStackNavigationProp<typeof SCREEN_UPLOADED_FILES_LIST>;

export const UploadedFilesList: FC<Props> = props => {
  const theme = useContext(ThemeContext);

  const styles = useUploadedFilesListStyles();
  const navigation = useNavigation();
  const { showActionSheet } = useCustomActionSheet();

  const [currentTab, setCurrentTab] = useState(Tabs.AttachedFiles);
  const [searchString, setSearchString] = useState('');
  const [filesListScrolled, setFilesListScrolled] = useState(false);

  const iosSearchBarInputRef = useRef<IosSearchBar>(null);
  const androidSearchBarInputRef = useRef<typeof AndroidSearchBar>(null);
  const filesListRef = useRef<FlatList>(null);

  const note = props.route.params.note;

  const { attachedFiles, allFiles, uploadFiles, attachFileToNote } = useFiles({
    note,
  });

  const filesList =
    currentTab === Tabs.AttachedFiles ? attachedFiles : allFiles;

  const filteredList = useMemo(() => {
    return searchString
      ? filesList.filter(file =>
          file.name.toLowerCase().includes(searchString.toLowerCase())
        )
      : filesList;
  }, [filesList, searchString]);

  useEffect(() => {
    let screenTitle = 'Files';
    if (searchString) {
      const filesCount = filteredList.length;
      screenTitle = `${filesCount} search result${filesCount !== 1 ? 's' : ''}`;
    }
    navigation.setOptions({
      title: screenTitle,
    });
  }, [filteredList.length, navigation, searchString]);

  const scrollListToTop = useCallback(() => {
    if (filesListScrolled && filteredList.length > 0) {
      filesListRef.current?.scrollToIndex({ animated: false, index: 0 });
      setFilesListScrolled(false);
    }
  }, [filesListScrolled, filteredList.length]);

  const handleFilter = useCallback(
    (textToSearch: string) => {
      setSearchString(textToSearch);
      scrollListToTop();
    },
    [scrollListToTop]
  );

  const { AttachedFiles, AllFiles } = Tabs;
  const {
    centeredView,
    header,
    headerTabContainer,
    noAttachmentsIcon,
    noAttachmentsIconContainer,
  } = styles;

  const onScroll = () => {
    if (filesListScrolled) {
      return;
    }
    setFilesListScrolled(true);
  };

  const handlePressAttach = () => {
    const options = [
      {
        text: 'Attach from files',
        callback: async () => {
          const uploadedFiles = await uploadFiles();
          console.log('returned');
          if (!uploadedFiles) {
            return;
          }
          if (currentTab === AttachedFiles) {
            uploadedFiles.forEach(file => attachFileToNote(file, false));
          }
        },
      },
      {
        text: 'Attach from Camera or Photo Library',
        callback: () => {
          console.error('Not implemented');
        },
      },
    ];
    showActionSheet('Choose action', options);
  };

  const renderItem: ListRenderItem<SNFile> = ({ item }) => {
    return (
      <UploadedFileItem
        key={item.uuid}
        file={item}
        note={note}
        isAttachedToNote={attachedFiles.includes(item)}
      />
    );
  };

  return (
    <View style={centeredView}>
      <UploadFilesListContainer>
        <View style={header}>
          <View style={headerTabContainer}>
            <HeaderTabItem
              isActive={currentTab === AttachedFiles}
              isLeftTab={true}
              onTouchEnd={() => setCurrentTab(AttachedFiles)}
            >
              <TabText isActive={currentTab === AttachedFiles}>
                Attached
              </TabText>
            </HeaderTabItem>
            <HeaderTabItem
              isActive={currentTab === AllFiles}
              onTouchEnd={() => setCurrentTab(AllFiles)}
            >
              <TabText isActive={currentTab === AllFiles}>All files</TabText>
            </HeaderTabItem>
          </View>
        </View>
        <View>
          <SearchBar
            onChangeText={handleFilter}
            onSearchCancel={() => handleFilter('')}
            iosSearchBarInputRef={iosSearchBarInputRef}
            androidSearchBarInputRef={androidSearchBarInputRef}
          />
        </View>

        {filteredList.length > 0 ? (
          <FlatList
            ref={filesListRef}
            data={filteredList}
            renderItem={renderItem}
            keyExtractor={item => item.uuid}
            onScroll={onScroll}
          />
        ) : (
          <View style={noAttachmentsIconContainer}>
            <SnIcon
              type={'files-illustration'}
              style={noAttachmentsIcon}
              width={72}
              height={72}
            />
            <Text>
              {searchString
                ? 'No files found'
                : 'No files attached to this note'}
            </Text>
          </View>
        )}
        <FAB
          buttonColor={theme.stylekitInfoColor}
          iconTextColor={theme.stylekitInfoContrastColor}
          onClickAction={handlePressAttach}
          visible={true}
          size={30}
          iconTextComponent={
            <Icon name={ThemeService.nameForIcon(ICON_ATTACH)} />
          }
        />
      </UploadFilesListContainer>
    </View>
  );
};

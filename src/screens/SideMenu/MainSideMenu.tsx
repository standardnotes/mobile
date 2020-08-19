import { AppStateType } from '@Lib/ApplicationState';
import { useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_SETTINGS } from '@Screens/screens';
import { ICON_SETTINGS } from '@Style/icons';
import { StyleKit, StyleKitContext, ThemeContent } from '@Style/StyleKit';
import _ from 'lodash';
import React, {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import FAB from 'react-native-fab';
import DrawerLayout from 'react-native-gesture-handler/DrawerLayout';
import Icon from 'react-native-vector-icons/Ionicons';
import { ContentType, SNTag, SNTheme, ThemeMutator } from 'snjs';
import { ThemeContext } from 'styled-components/native';
import {
  FirstSafeAreaView,
  MainSafeAreaView,
  SideMenuSectionContainer,
} from './MainSideMenu.styled';
import { SideMenuHero } from './SideMenuHero';
import { SideMenuOption, SideMenuSection } from './SideMenuSection';
import { TagSelectionList } from './TagSelectionList';

type Props = {
  drawerRef: DrawerLayout | null;
};

export const MainSideMenu = ({ drawerRef }: Props): JSX.Element => {
  // Context
  const theme = useContext(ThemeContext);
  const styleKit = useContext(StyleKitContext);
  const application = useContext(ApplicationContext);
  const navigation = useNavigation();

  // const { showActionSheet } = useCustomActionSheet();
  // State
  const [selectedTag, setSelectedTag] = useState(() =>
    application!.getAppState().getSelectedTag()
  );
  const [themes, setThemes] = useState<SNTheme[]>([]);

  useEffect(() => {
    const removeTagChangeObserver = application!
      .getAppState()
      .addStateChangeObserver(state => {
        if (state === AppStateType.TagChanged) {
          setSelectedTag(application!.getAppState().getSelectedTag());
        }
      });
    return removeTagChangeObserver;
  });

  const onSystemThemeSelect = useCallback(
    async (selectedTheme: ThemeContent) => {
      const oldTheme = application!.findItem(styleKit!.activeThemeId!) as
        | SNTheme
        | undefined;

      styleKit?.activateSystemTheme(selectedTheme.uuid);
      if (oldTheme?.isTheme() && oldTheme.isMobileActive()) {
        await application?.changeAndSaveItem(oldTheme.uuid, mutator => {
          const themeMutator = mutator as ThemeMutator;
          themeMutator.setMobileActive(false);
        });
      }
    },
    [application, styleKit]
  );

  const onThemeSelect = useCallback(
    async (selectedTheme: SNTheme) => {
      if (!selectedTheme.isMobileActive()) {
        await application?.changeItem(selectedTheme.uuid, mutator => {
          const themeMutator = mutator as ThemeMutator;
          themeMutator.setMobileActive(true);
        });
        if (application!.findItem(styleKit!.activeThemeId!)) {
          await application?.changeItem(styleKit!.activeThemeId!, mutator => {
            const themeMutator = mutator as ThemeMutator;
            themeMutator.setMobileActive(false);
          });
        }
        await application?.sync();
      }
    },
    [application, styleKit]
  );

  useEffect(() => {
    const unsubscribeStreamThemes = application?.streamItems(
      ContentType.Theme,
      () => {
        const newItems = application.getItems(ContentType.Theme);
        setThemes(newItems as SNTheme[]);
      }
    );

    return unsubscribeStreamThemes;
  }, [application]);

  const iconDescriptorForTheme = (currentTheme: SNTheme | ThemeContent) => {
    const desc = {
      type: 'circle',
      side: 'right' as 'right',
    };

    const dockIcon =
      currentTheme.package_info && currentTheme.package_info.dock_icon;

    if (dockIcon && dockIcon.type === 'circle') {
      _.merge(desc, {
        backgroundColor: dockIcon.background_color,
        borderColor: dockIcon.border_color,
      });
    } else {
      _.merge(desc, {
        backgroundColor: theme.stylekitInfoColor,
        borderColor: theme.stylekitInfoColor,
      });
    }

    return desc;
  };

  const themeOptions = useMemo(() => {
    const options: SideMenuOption[] = styleKit!
      .systemThemes()
      .map(systemTheme => ({
        text: systemTheme?.name,
        key: systemTheme?.uuid,
        iconDesc: iconDescriptorForTheme(systemTheme),
        dimmed: false,
        onSelect: () => onSystemThemeSelect(systemTheme),
        selected: styleKit!.activeThemeId === systemTheme?.uuid,
      }))
      .concat(
        themes
          .filter(el => !el.errorDecrypting)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(mapTheme => ({
            text: mapTheme.name,
            key: mapTheme.uuid,
            iconDesc: iconDescriptorForTheme(mapTheme),
            dimmed: mapTheme.getNotAvailOnMobile(),
            onSelect: () => onThemeSelect(mapTheme),
            selected: styleKit!.activeThemeId === mapTheme.uuid,
          }))
      );

    return options;
    // We want to also track activeThemeId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    styleKit,
    styleKit?.activeThemeId,
    themes,
    onSystemThemeSelect,
    onThemeSelect,
  ]);

  const onTagSelect = async (tag: SNTag) => {
    if (tag.conflictOf) {
      application!.changeAndSaveItem(tag.uuid, mutator => {
        mutator.conflictOf = undefined;
      });
    }
    application!.getAppState().setSelectedTag(tag);
    drawerRef?.closeDrawer();
  };

  const openSettings = () => {
    drawerRef?.closeDrawer();
    navigation?.navigate(SCREEN_SETTINGS);
  };

  const outOfSyncPressed = async () => {
    const confirmed = await application!.alertService!.confirm(
      "We've detected that the data in the current application session may not match the data on the server. This can happen due to poor network conditions, or if a large note fails to download on your device. To resolve this issue, we recommend first creating a backup of your data in the Settings screen, the signing out of your account and signing back in.",
      'Potentially Out of Sync',
      'Open Settings',
      undefined
    );
    if (confirmed) {
      openSettings();
    }
  };

  return (
    <Fragment>
      <FirstSafeAreaView />
      <MainSafeAreaView>
        <SideMenuHero
          testID="settingsButton"
          onPress={openSettings}
          onOutOfSyncPress={outOfSyncPressed}
        />

        <SideMenuSectionContainer
          data={[
            <SideMenuSection
              title="Themes"
              key="themes-section"
              options={themeOptions}
              collapsed={true}
            />,
            <SideMenuSection title="Views" key="views-section">
              <TagSelectionList
                key="views-section-list"
                contentType={ContentType.SmartTag}
                onTagSelect={onTagSelect}
                selectedTags={selectedTag ? [selectedTag] : []}
              />
            </SideMenuSection>,

            <SideMenuSection title="Tags" key="tags-section">
              <TagSelectionList
                key="tags-section-list"
                hasBottomPadding={Platform.OS === 'android'}
                emptyPlaceholder={'No tags. Create one from the note composer.'}
                contentType={ContentType.Tag}
                onTagSelect={onTagSelect}
                selectedTags={selectedTag ? [selectedTag] : []}
              />
            </SideMenuSection>,
          ]}
          // @ts-expect-error
          renderItem={({ item }) => item}
        />

        <FAB
          buttonColor={theme.stylekitInfoColor}
          iconTextColor={theme.stylekitInfoContrastColor}
          onClickAction={openSettings}
          visible={true}
          size={29}
          paddingTop={Platform.OS ? 2 : 0}
          iconTextComponent={
            <Icon name={StyleKit.nameForIcon(ICON_SETTINGS)} />
          }
        />
      </MainSafeAreaView>
    </Fragment>
  );
};

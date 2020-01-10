import React, { Component, Fragment } from 'react';
import { ScrollView, View, Text, FlatList, Linking } from 'react-native';
import { DrawerActions } from 'react-navigation-drawer';

import { SafeAreaView } from 'react-navigation';

import Icon from 'react-native-vector-icons/Ionicons';
import FAB from 'react-native-fab';
import ActionSheet from 'react-native-actionsheet'

import Abstract from "@Screens/Abstract"
import AlertManager from "@SFJS/alertManager"
import Auth from "@SFJS/authManager"
import Sync from '@SFJS/syncManager'

import SectionHeader from "@Components/SectionHeader";
import TableSection from "@Components/TableSection";
import LockedView from "@Containers/LockedView";

import StyleKit, {
  LIGHT_MODE_KEY,
  DARK_MODE_KEY,
  themeStorageKeyForMode
} from "@Style/StyleKit";
import ActionSheetWrapper from "@Style/ActionSheetWrapper"

import { supportsDarkMode } from 'react-native-dark-mode'

import SideMenuManager from "@SideMenu/SideMenuManager"
import SideMenuCell from "@SideMenu/SideMenuCell"
import SideMenuHero from "@SideMenu/SideMenuHero"
import SideMenuSection from "@SideMenu/SideMenuSection"
import TagSelectionList from "@SideMenu/TagSelectionList"

import ApplicationState from "@Lib/ApplicationState"
import OptionsState from "@Lib/OptionsState"
import AbstractSideMenu from "@SideMenu/AbstractSideMenu"

export default class MainSideMenu extends AbstractSideMenu {

  constructor(props) {
    super(props);
    this.constructState({});

    this.signoutObserver = Auth.get().addEventHandler((event) => {
      if(event == SFAuthManager.DidSignOutEvent) {
        this.setState({outOfSync: false});
        this.forceUpdate();
      }
    });

    this.syncEventHandler = Sync.get().addEventHandler((event, data) => {
      if(event == 'enter-out-of-sync') {
        this.setState({outOfSync: true});
      } else if(event == 'exit-out-of-sync') {
        this.setState({outOfSync: false});
      }
    })
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    Auth.get().removeEventHandler(this.signoutObserver);
    Sync.get().removeEventHandler(this.syncEventHandler);
  }

  presentSettings() {
    this.props.navigation.navigate("Settings");
  }

  outOfSyncPressed() {
    AlertManager.get().confirm({
      title: "Potentially Out of Sync",
      text: "We've detected that the data in the current application session may not match the data on the server. This can happen due to poor network conditions, or if a large note fails to download on your device. To resolve this issue, we recommend first creating a backup of your data in the Settings screen, the signing out of your account and signing back in.",
      confirmButtonText: "Open Settings",
      onConfirm: () => {
        this.presentSettings();
      }
    })
  }

  get handler() {
    return SideMenuManager.get().getHandlerForLeftSideMenu();
  }

  onTagSelect = (tag) => {
    this.handler.onTagSelect(tag);
    this.forceUpdate();
  }

  onThemeSelect = (theme) => {
    // Prevent themes that aren't meant for mobile from being activated
    if(theme.content.package_info && theme.content.package_info.no_mobile) {
      AlertManager.get().alert({
        title: "Not Available",
        text: "This theme is not available on mobile."
      })

      return;
    }

    StyleKit.get().activateTheme(theme);
    this.forceUpdate();
  }

  onThemeLongPress = (theme) => {
    let actionSheetOptions = [];

    // if this theme is a mobile theme, allow it to be set as the preferred option for light/dark mode
    if(theme.content.package_info && !theme.content.package_info.no_mobile) {
      const allowsDarkModeChoice = supportsDarkMode && !theme.content.isSystemTheme;
      const lightThemeAction = this.themeActionForMode({theme: theme, mode: LIGHT_MODE_KEY});
      const lightThemeName = allowsDarkModeChoice ? "Light" : "Active";
      const setLightThemeActionName = `${lightThemeAction} ${lightThemeName} Theme`;

      actionSheetOptions.push(
        ActionSheetWrapper.BuildOption({text: setLightThemeActionName, callback: () => {
          StyleKit.get().saveThemeForMode({theme: theme, mode: LIGHT_MODE_KEY});
        }})
      );

      // only add a dark mode option if this theme supports dark/light mode
      if(allowsDarkModeChoice) {
        const setDarkThemeActionName = `${this.themeActionForMode({theme: theme, mode: DARK_MODE_KEY})} Dark Theme`;

        actionSheetOptions.push(
          ActionSheetWrapper.BuildOption({text: setDarkThemeActionName, callback: () => {
            StyleKit.get().saveThemeForMode({theme: theme, mode: DARK_MODE_KEY});
          }})
        )
      }
    }

    // system themes cannot be redownloaded, so prevent this option from being added on long press
    if(!theme.content.isSystemTheme) {
      actionSheetOptions.push(
        ActionSheetWrapper.BuildOption({text: "Redownload", callback: () => {
          this.onThemeRedownload(theme);
        }})
      );
    }

    let sheet = new ActionSheetWrapper({
      title: `${theme.name} Options`,
      options: actionSheetOptions,
      onCancel: () => {
        this.setState({actionSheet: null});
      }
    });

    this.setState({actionSheet: sheet.actionSheetElement()});
    this.forceUpdate(); // required to get actionSheet ref
    sheet.show();
  }

  onThemeRedownload(theme) {
    AlertManager.get().confirm({
      title: "Redownload Theme",
      text: "Themes are cached when downloaded. To retrieve the latest version, press Redownload.",
      confirmButtonText: "Redownload",
      onConfirm: () => {
        StyleKit.get().downloadThemeAndReload(theme);
      }
    })
  }

  themeActionForMode({theme, mode}) {
    const isThemeForCurrentMode = StyleKit.get().isThemeActive(theme) &&
        mode === StyleKit.get().currentDarkMode;

    return isThemeForCurrentMode ||
        theme.content[themeStorageKeyForMode(mode)]
        ? "Current" : "Set as";
  }

  iconDescriptorForTheme = (theme) => {
    let desc = {
      type: 'circle',
      side: 'right'
    };

    let dockIcon = theme.content.package_info && theme.content.package_info.dock_icon;

    if(dockIcon && dockIcon.type == 'circle') {
      _.merge(desc, {
        backgroundColor: dockIcon.background_color,
        borderColor: dockIcon.border_color,
      })
    } else {
      _.merge(desc, {
        backgroundColor: StyleKit.variables.stylekitInfoColor,
        borderColor: StyleKit.variables.stylekitInfoColor
      })
    }

    return desc;
  }

  buildOptionsForThemes() {
    let themes = StyleKit.get().themes();
    let options = [];
    for(let theme of themes) {
      const dimmed = theme.getNotAvailOnMobile() || (theme.content.package_info && theme.content.package_info.no_mobile);
      let option = SideMenuSection.BuildOption({
        text: theme.name,
        key: theme.uuid || theme.name,
        iconDesc: this.iconDescriptorForTheme(theme),
        dimmed: dimmed,
        selected: StyleKit.get().isThemeActive(theme),
        onSelect: () => {this.onThemeSelect(theme)},
        onLongPress: () => {this.onThemeLongPress(theme)}
      })

      options.push(option);
    }

    // Red and Blue default
    if(themes.length == 2) {
      options.push(SideMenuSection.BuildOption({
        text: "Get More Themes",
        key: 'get-theme',
        iconDesc: {
          type: 'icon',
          name: StyleKit.nameForIcon("brush"),
          side: "right",
          size: 17
        },
        onSelect: () => { ApplicationState.openURL("https://standardnotes.org/extensions")},
      }));
    }

    return options;
  }

  render() {
    const viewStyles = [StyleKit.styles.container, this.styles.sideMenu];

    if(this.state.lockContent) {
      return (<LockedView style={viewStyles} />);
    }

    if(!this.handler || SideMenuManager.get().isLeftSideMenuLocked()) {
      // Return empty, but colored view
      return <View style={viewStyles} />;
    }

    const themeOptions = this.buildOptionsForThemes();
    const selectedTags = this.handler.getSelectedTags();

    const sideMenuComponents = [
      <SideMenuSection title="Themes" key="themes-section" options={themeOptions} collapsed={true} />,

      <SideMenuSection title="Views" key="views-section">
        <TagSelectionList
          key="views-section-list"
          contentType="SN|SmartTag"
          onTagSelect={this.onTagSelect}
          selectedTags={selectedTags}
        />
      </SideMenuSection>,

      <SideMenuSection title="Tags" key="tags-section">
        <TagSelectionList
          key="tags-section-list"
          hasBottomPadding={ApplicationState.isAndroid}
          emptyPlaceholder={"No tags. Create one from the note composer."}
          contentType="Tag"
          onTagSelect={this.onTagSelect}
          selectedTags={selectedTags}
        />
      </SideMenuSection>
    ];

    return (
      <Fragment>
        <SafeAreaView style={this.styles.firstSafeArea} />
        <SafeAreaView forceInset={{ top: 'never', bottom: 'always', left: 'always', right: 'never' }} style={[viewStyles, this.styles.secondSafeArea]}>

          <SideMenuHero
            outOfSync={this.state.outOfSync}
            onPress={() => {this.presentSettings()}}
            onOutOfSyncPress={() => {this.outOfSyncPressed()}}
          />

          <FlatList
            style={this.styles.flatList}
            data={sideMenuComponents}
            renderItem={({item}) => item}
          />

          <FAB
            buttonColor={StyleKit.variables.stylekitInfoColor}
            iconTextColor={StyleKit.variables.stylekitInfoContrastColor}
            onClickAction={() => {this.presentSettings()}}
            visible={true}
            size={29}
            paddingTop={ApplicationState.isIOS ? 2 : 0}
            iconTextComponent={<Icon name={StyleKit.nameForIcon("settings")}/>}
          />

          {this.state.actionSheet && this.state.actionSheet}
        </SafeAreaView>
      </Fragment>
    );
  }

  loadStyles() {
    this.styles = {
      // We want top color to be different from bottom color of safe area.
      // See https://stackoverflow.com/questions/47725607/react-native-safeareaview-background-color-how-to-assign-two-different-backgro
      firstSafeArea: {
        flex:0,
        backgroundColor: StyleKit.variables.stylekitContrastBackgroundColor
      },
      secondSafeArea: {
        flex:1,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor
      },
      sideMenu: {
        // We want the header to be totally contrast, but content to be main
        // So we have to set top level to contrast and individual elements to main
        backgroundColor: StyleKit.variables.stylekitContrastBackgroundColor,
        color: StyleKit.variables.stylekitForegroundColor,
        flex: 1,
        flexDirection: "column"
      },
      flatList: {
        padding: 15,
        flex: 1,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
      }
    }
  }
}

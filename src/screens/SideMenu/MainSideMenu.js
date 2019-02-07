import React, { Component, Fragment } from 'react';
import { ScrollView, View, Text, FlatList, Linking } from 'react-native';

import { SafeAreaView } from 'react-navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import FAB from 'react-native-fab';
import ActionSheet from 'react-native-actionsheet'

import Abstract from "@Screens/Abstract"
import AlertManager from "@SFJS/alertManager"
import Auth from "@SFJS/authManager"

import SectionHeader from "@Components/SectionHeader";
import TableSection from "@Components/TableSection";
import LockedView from "@Containers/LockedView";

import StyleKit from "@Style/StyleKit"

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
        this.forceUpdate();
      }
    });
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    Auth.get().removeEventHandler(this.signoutObserver);
  }

  presentSettings() {
    this.props.navigation.navigate("Settings");
  }

  get handler() {
    return SideMenuManager.get().getHandlerForLeftSideMenu();
  }

  onTagSelect = (tag) => {
    this.handler.onTagSelect(tag);
    this.forceUpdate();
  }

  onThemeSelect = (theme) => {
    StyleKit.get().activateTheme(theme);
    this.forceUpdate();
  }

  onThemeLongPress = (theme) => {
    AlertManager.get().confirm({
      title: "Redownload Theme",
      text: "Themes are cached when downloaded. To retrieve the latest version, press Redownload.",
      confirmButtonText: "Redownload",
      onConfirm: () => {
        StyleKit.get().downloadThemeAndReload(theme);
      }
    })
  }

  iconDescriptorForTheme = (theme) => {
    let desc = {
      type: "circle",
      side: "right"
    };

    let dockIcon = theme.content.package_info && theme.content.package_info.dock_icon;

    if(dockIcon && dockIcon.type == "circle") {
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
      let option = SideMenuSection.BuildOption({
        text: theme.name,
        key: theme.uuid || theme.name,
        iconDesc: this.iconDescriptorForTheme(theme),
        dimmed: theme.getNotAvailOnMobile(),
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
        key: "get-theme",
        iconDesc: {
          type: "icon",
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
    var viewStyles = [StyleKit.styles.container, this.styles.sideMenu];

    if(this.state.lockContent) {
      return (<LockedView style={viewStyles} />);
    }

    if(!this.handler || SideMenuManager.get().isLeftSideMenuLocked()) {
      // Return empty, but colored view
      return <View style={viewStyles} />;
    }

    let themeOptions = this.buildOptionsForThemes();
    let selectedTags = this.handler.getSelectedTags();

    return (
      <Fragment>
        <SafeAreaView style={this.styles.firstSafeArea} />
        <SafeAreaView style={[viewStyles, this.styles.secondSafeArea]}>

          <SideMenuHero onPress={() => {this.presentSettings()}}/>

          <ScrollView style={this.styles.scrollView} removeClippedSubviews={false}>

            <SideMenuSection title="Themes" options={themeOptions} collapsed={true} />

            <SideMenuSection title="Views">
              <TagSelectionList contentType="SN|SmartTag" onTagSelect={this.onTagSelect} selectedTags={selectedTags} />
            </SideMenuSection>

            <SideMenuSection title="Tags">
              <TagSelectionList
                hasBottomPadding={ApplicationState.isAndroid}
                emptyPlaceholder={"No tags. Create one from the note composer."}
                contentType="Tag"
                onTagSelect={this.onTagSelect}
                selectedTags={selectedTags}
              />
            </SideMenuSection>
          </ScrollView>

          <FAB
            buttonColor={StyleKit.variables.stylekitInfoColor}
            iconTextColor={StyleKit.variables.stylekitInfoContrastColor}
            onClickAction={() => {this.presentSettings()}}
            visible={true}
            size={29}
            paddingTop={ApplicationState.isIOS ? 2 : 0}
            iconTextComponent={<Icon name={StyleKit.nameForIcon("settings")}/>}
          />

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
      scrollView: {
        padding: 15,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
      }
    }
  }
}

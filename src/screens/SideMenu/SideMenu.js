import React, { Component, Fragment } from 'react';
import { ScrollView, View, Text, FlatList } from 'react-native';

import { SafeAreaView } from 'react-navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import FAB from 'react-native-fab';
import ActionSheet from 'react-native-actionsheet'

import Abstract from "@Screens/Abstract"

import SectionHeader from "@Components/SectionHeader";
import TableSection from "@Components/TableSection";
import LockedView from "@Containers/LockedView";

import Icons from '@Style/Icons';
import StyleKit from "@Style/StyleKit"

import SideMenuManager from "@SideMenu/SideMenuManager"
import SideMenuCell from "@SideMenu/SideMenuCell"
import SideMenuHero from "@SideMenu/SideMenuHero"
import SideMenuSection from "@SideMenu/SideMenuSection"
import TagSelectionList from "@SideMenu/TagSelectionList"

import ApplicationState from "@Root/ApplicationState";
import OptionsState from "@Root/OptionsState"

export default class SideMenu extends Abstract {

  constructor(props) {
    super(props);
    this.constructState({});
    this.state = {};
  }

  presentSettings() {
    this.props.navigation.navigate("Settings");
  }

  get handler() {
    return SideMenuManager.get().getHandlerForLeftSideMenu();
  }

  onTagSelect = (tag) => {
    this.handler.onTagSelect(tag);
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
        text: "Get Themes",
        key: "get-theme",
        onSelect: () => { Linking.openURL("https://standardnotes.org/extensions")},
      }));
    }

    return options;
  }

  render() {
    var viewStyles = [StyleKit.styles().container, this.styles.sideMenu];

    if(this.state.lockContent) {
      return (<LockedView style={viewStyles} />);
    }

    if(!this.handler || SideMenuManager.get().isLeftSideMenuLocked()) {
      return null
    }

    let themeOptions = this.buildOptionsForThemes();
    let selectedTags = this.handler.getSelectedTags();

    return (
      <Fragment>
        <SafeAreaView style={this.styles.firstSafeArea} />
        <SafeAreaView style={[viewStyles, this.styles.secondSafeArea]}>
          <View style={this.styles.hero}>
            <SideMenuHero />
          </View>

          <ScrollView style={this.styles.scrollView} removeClippedSubviews={false}>

            <SideMenuSection title="Themes" options={themeOptions} collapsed={false} />

            <SideMenuSection title="Tags">
              <TagSelectionList onTagSelect={this.onTagSelect} selectedTags={selectedTags} />
            </SideMenuSection>

            <SideMenuSection title="Sort By">
            </SideMenuSection>

            <SideMenuSection title="Display Options">
            </SideMenuSection>
          </ScrollView>

          <FAB
            buttonColor={StyleKit.variable("stylekitInfoColor")}
            iconTextColor={StyleKit.variable("stylekitInfoContrastColor")}
            onClickAction={() => {this.note ? this.presentNewTag() : this.presentSettings()}}
            visible={true}
            iconTextComponent={<Icon name={this.note ? "md-pricetag" : "md-settings"}/>}
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
      hero: {
        height: 75,
        padding: 15,
        paddingTop: 25,
        backgroundColor: StyleKit.variables.stylekitContrastBackgroundColor,
        borderBottomColor: StyleKit.variables.stylekitContrastBorderColor,
        borderBottomWidth: 1
      },
      scrollView: {
        padding: 15,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
      }
    }
  }
}

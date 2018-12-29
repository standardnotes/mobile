import React, { Component, Fragment } from 'react';
import { ScrollView, View, Text, FlatList } from 'react-native';

import { SafeAreaView } from 'react-navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import FAB from 'react-native-fab';
import ActionSheet from 'react-native-actionsheet'

import Abstract from "@Screens/Abstract"
import Sync from '@SFJS/syncManager'
import ModelManager from '@SFJS/modelManager'
import ItemActionManager from '@Lib/itemActionManager'

import SectionHeader from "@Components/SectionHeader";
import TableSection from "@Components/TableSection";
import SectionedAccessoryTableCell from "@Components/SectionedAccessoryTableCell";

import LockedView from "@Containers/LockedView";

import Icons from '@Style/Icons';
import StyleKit from "@Style/StyleKit"

import SideMenuCell from "@SideMenu/SideMenuCell"
import SideMenuHero from "@SideMenu/SideMenuHero"
import SideMenuSection from "@SideMenu/SideMenuSection"

import ApplicationState from "@Root/ApplicationState";
import OptionsState from "@Root/OptionsState"

export default class SideMenu extends Abstract {

  /*
  Initilization
   */

  constructor(props) {
    super(props);
    this.loadStyles();
    this.constructState({});
    this.tags = [];
    this.options = ApplicationState.getOptions();
  }

  loadInitialState() {
    super.loadInitialState();

    var selectedTags;
    if(this.options.selectedTags) {
      selectedTags = this.options.selectedTags.slice(); // copy the array
    } else {
      selectedTags = [];
    }

    this.mergeState({tags: [], selectedTags: selectedTags, options: this.options});

    let handleInitialDataLoad = () => {
      if(this.handledDataLoad) { return; }
      this.handledDataLoad = true;
      this.tagsNeedReload = true;
      this.forceUpdate();
    }

    if(Sync.get().initialDataLoaded()) {
      handleInitialDataLoad();
    }

    this.syncEventHandler = Sync.get().addEventHandler((event, data) => {
      if(event == "local-data-loaded") {
        handleInitialDataLoad();
      }

      else if(event == "sync:completed") {
        if(data.retrievedItems && _.find(data.retrievedItems, {content_type: "Tag"})) {
          this.forceUpdate();
        }
      }
    })

    this.setState({initialDataLoaded: true});
  }

  /*
  Reusables
  */

  reloadTags() {
    var tags = ModelManager.get().tags.slice();
    tags.unshift({title: "All notes", key: "all", uuid: 100})
    this.tags = tags;
    this.tagsNeedReload = false;
  }


  /*
  Lifecycle Callbacks
  */

  componentWillUnmount() {
    super.componentWillUnmount();
    ApplicationState.get().removeStateObserver(this.stateObserver);
    Sync.get().removeEventHandler(this.syncEventHandler);
  }

  componentDidFocus() {
    super.componentDidFocus();
    this.forceUpdate();
  }


  /*
  Tag Options
  */

  presentNewTag() {
    this.props.navigation.navigate("NewTag", {
      title: 'New Tag',
      placeholder: "New tag name",
      onSave: (text) => {
        this.createTag(text, (tag) => {
          if(this.note) {
            // select this tag
            this.onTagSelect(tag)
          }
        });
      }
    })
  }

  createTag(text, callback) {
    var tag = new SNTag({content: {title: text}});
    tag.initUUID().then(() => {
      tag.setDirty(true);
      ModelManager.get().addItem(tag);
      Sync.get().sync();
      callback(tag);
      this.forceUpdate();
    })
  }

  onTagSelect = (tag) => {
    var selectedTags = [tag.uuid];
    this.setSelectedTags(selectedTags);
  }

  setSelectedTags = (selectedTags) => {
    this.selectedTags = selectedTags.slice();
    this.options.setSelectedTags(selectedTags);
    this.setState({selectedTags: selectedTags});
  }

  isTagSelected(tag) {
    return this.tags.indexOf(tag.uuid) !== -1;
  }

  onManageTagEvent = (event, tag, renderBlock) => {
    ItemActionManager.handleEvent(event, tag, () => {
        if(event == ItemActionManager.DeleteEvent) {
          this.tagsNeedReload = true;
          this.forceUpdate();
        }
    }, () => {
      // afterConfirmCallback
      // We want to show "Deleting.." on top of note cell after the user confirms the dialogue
      renderBlock();
    })
  }



  /*
  Theme options
  */

   onThemeSelect = (theme) => {
     StyleKit.get().activateTheme(theme);
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



  /*
  Navigation
  */

  presentSettings() {
    this.props.navigation.navigate("Settings");
  }

  static ActionSheetCancelIndex = 0;
  static ActionSheetDestructiveIndex = 1;

  actionSheetActions() {
    return [
      ['Cancel', ""],
      ['Delete', ItemActionManager.DeleteEvent]
    ];
  }

  showActionSheet = (item) => {
    // Dont show actionsheet for "All notes" tag
    if(item.key !== "all") {
      this.actionSheetItem = item;
      this.setState((prevState) => {
        return _.merge(prevState, {actionSheetTitle: item.title})
      })
      this.actionSheet.show();
    }
  }

  handleActionSheetPress = (index) => {
    if(index == 0) {
      return;
    }

    this.onManageTagEvent(this.actionSheetActions()[index][1], this.actionSheetItem, () => {
      this.forceUpdate();
    });
    this.actionSheetItem = null;
  }



  /*
  Render
  */

  iconDescriptorForTheme = (theme) => {
    let desc = {
      type: "circle",
      side: "right"
    };

    let dockIcon = theme.content.package_info && theme.content.package_info.dock_icon;

    if(dockIcon) {
      _.merge(desc, {
        backgroundColor: dockIcon.background_color,
        borderColor: dockIcon.border_color,
      })
    } else {
      _.merge(desc, {
        backgroundColor: "red",
        borderColor: "red"
      })
    }

    return desc;
  }

  iconDescriptorForTag = (tag) => {
    return {
      type: "ascii",
      value: "#"
    };
  }

  buildOptionsForThemes() {
    let themes = StyleKit.get().themes();
    let options = [];
    for(var theme of themes) {
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

  // must pass title, text, and tags as props so that it re-renders when either of those change
  renderTagCell = ({item}) => {
    return (
      <View>
        <SideMenuCell
          onSelect={() => {this.onTagSelect(item)}}
          onLongPress={() => this.showActionSheet(item)}
          text={item.deleted ? "Deleting..." : item.title}
          iconDesc={this.iconDescriptorForTag(item)}
          // color={item.deleted ? StyleKit.variable("stylekitInfoColor") : undefined}
          key={item.uuid}
          selected={() => {return this.state.selectedTags.includes(item.uuid)}}
        />

        <ActionSheet
          title={this.state.actionSheetTitle}
          ref={o => this.actionSheet = o}
          options={this.actionSheetActions().map((action) => {return action[0]})}
          cancelButtonIndex={SideMenu.ActionSheetCancelIndex}
          destructiveButtonIndex={SideMenu.ActionSheetDestructiveIndex}
          onPress={this.handleActionSheetPress}
          {...StyleKit.actionSheetStyles()}
        />
      </View>
    )
  }

  render() {
    var viewStyles = [StyleKit.styles().container, this.styles.sideMenu];

    if(this.state.lockContent || !this.state.initialDataLoaded) {
      return (<LockedView style={viewStyles} />);
    }

    if(this.tagsNeedReload) {
      this.reloadTags();
    }

    let themeOptions = this.buildOptionsForThemes();

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
              <FlatList
                initialNumToRender={10}
                windowSize={10}
                maxToRenderPerBatch={10}
                data={this.tags}
                renderItem={this.renderTagCell}
              />
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

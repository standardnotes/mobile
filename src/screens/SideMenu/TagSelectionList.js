import React, { Component, Fragment } from 'react';
import {
  ScrollView,
  View,
  Text,
  FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { withNavigation } from 'react-navigation';
import ThemedComponent from '@Components/ThemedComponent';
import ApplicationState from '@Lib/ApplicationState';
import ItemActionManager from '@Lib/itemActionManager';
import OptionsState from '@Lib/OptionsState';
import { SCREEN_INPUT_MODAL } from '@Screens/screens';
import Auth from '@SFJS/authManager';
import ModelManager from '@SFJS/modelManager';
import Sync from '@SFJS/syncManager';
import SideMenuCell from '@SideMenu/SideMenuCell';
import ActionSheetWrapper from '@Style/ActionSheetWrapper';
import StyleKit from '@Style/StyleKit';

class TagSelectionList extends ThemedComponent {

  /*
    @param props.selectedTags
    @param props.onTagSelect
  */

  constructor(props) {
    super(props);
    this.state = {tags: []};
  }

  componentDidMount() {
    let handleInitialDataLoad = () => {
      if(this.handledDataLoad) { return; }
      this.handledDataLoad = true;
      this.reload();
    }

    this.reload();

    this.signoutObserver = Auth.get().addEventHandler((event) => {
      if(event == SFAuthManager.DidSignOutEvent) {
        this.reload();
      }
    });

    this.syncObserverId = `${Math.random()}`;

    ModelManager.get().addItemSyncObserver(this.syncObserverId, this.props.contentType, () => {
      this.reload();
    })

    this.syncEventHandler = Sync.get().addEventHandler((event, data) => {
      if(event == "local-data-loaded") {
        handleInitialDataLoad();
      }
    })
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    ModelManager.get().removeItemSyncObserver(this.syncObserverId);
    Sync.get().removeEventHandler(this.syncEventHandler);
    Auth.get().removeEventHandler(this.signoutObserver);
  }

  reload = () => {
    let tags;
    if(this.props.contentType == "Tag") {
      tags = ModelManager.get().tags.slice();
    } else {
      tags = ModelManager.get().getSmartTags();
    }
    this.setState({tags: tags});
  }

  /*
  Tag Options
  */

  onTagSelect = (tag) => {
    this.props.onTagSelect(tag);
  }

  showActionSheet = (tag) => {
    if(tag.content.isSystemTag) {
      return;
    }

    let sheet = new ActionSheetWrapper({
      title: tag.title,
      options: [
        ActionSheetWrapper.BuildOption({text: "Rename", callback: () => {
          this.props.navigation.navigate(SCREEN_INPUT_MODAL, {
            title: 'Rename Tag',
            placeholder: "Tag name",
            initialValue: tag.title,
            onSubmit: (text) => {
              if(tag) {
                tag.title = text; // Update the text on the tag to the input text
                tag.setDirty(true);
                Sync.get().sync();
                this.forceUpdate();
              }
            }
          })
        }}),
        ActionSheetWrapper.BuildOption({text: "Delete", destructive: true, callback: () => {
          ItemActionManager.handleEvent(ItemActionManager.DeleteEvent, tag, () => {
            this.reload();
          });
        }})
      ], onCancel: () => {
        this.setState({actionSheet: null});
      }
    });

    this.setState({actionSheet: sheet.actionSheetElement()});
    this.forceUpdate(); // required to get actionSheet ref
    sheet.show();
  }

  iconDescriptorForTag = (tag) => {
    return {
      type: "ascii",
      value: "#"
    };
  }

  // must pass title, text, and tags as props so that it re-renders when either of those change
  renderTagCell = ({item}) => {
    let title = item.deleted ? "Deleting..." : item.title;
    if(item.errorDecrypting) {
      title = "Unable to Decrypt";
    }
    return (
      <View>
        <SideMenuCell
          onSelect={() => {this.onTagSelect(item)}}
          onLongPress={() => this.showActionSheet(item)}
          text={title}
          iconDesc={this.iconDescriptorForTag(item)}
          key={item.uuid}
          selected={this.props.selectedTags.includes(item)}
        />
      </View>
    )
  }

  render() {
    return (
      <Fragment>
        <FlatList
          style={this.styles.list}
          initialNumToRender={10}
          windowSize={10}
          maxToRenderPerBatch={10}
          data={this.state.tags}
          renderItem={this.renderTagCell}
          extraData={this.props.selectedTags /* Required to force list cells to update on selection change */}
        />

        {this.state.tags.length == 0 &&
          <Text style={this.styles.emptyPlaceholderText}>{this.props.emptyPlaceholder}</Text>
        }

        {this.state.actionSheet && this.state.actionSheet}
      </Fragment>
    )
  }

  loadStyles() {
    this.styles = {
      list: {
        paddingBottom: this.props.hasBottomPadding ? 30 : 0
      },
      emptyPlaceholderText: {
        color: StyleKit.variables.stylekitForegroundColor,
        opacity: 0.6,
        paddingRight: 30,
        lineHeight: 18
      }
    }
  }
}

export default withNavigation(TagSelectionList);

import React, { Component } from 'react';
import { TextInput, SectionList, ScrollView, View, Text, Share, Platform, StatusBar, FlatList, Dimensions } from 'react-native';
var _ = require('lodash')

import Sync from '../lib/sync'
import ModelManager from '../lib/modelManager'
import AlertManager from '../lib/alertManager'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import ManageNote from "../containers/ManageNote";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";
import Abstract from "./Abstract"
import Tag from "../models/app/tag"
import Icons from '../Icons';
import OptionsState from "../OptionsState"
import GlobalStyles from "../Styles"
import App from "../app"

export default class Filter extends Abstract {

  static navigatorStyle = {
    tabBarHidden: true
  };

  constructor(props) {
    super(props);
    this.tags = [];
    this.constructState({ready: false});

    this.readyObserver = App.get().addApplicationReadyObserver(() => {
      this.applicationIsReady = true;
      if(this.isMounted()) {
        this.loadInitialState();
      }
    })
  }

  componentDidMount() {
    super.componentDidMount();
    if(this.applicationIsReady && !this.state.ready) {
      this.loadInitialState();
    }
  }

  loadInitialState() {
    this.options = new OptionsState(JSON.parse(this.props.options));

    var selectedTags;
    if(this.options.selectedTags) {
      selectedTags = this.options.selectedTags.slice(); // copy the array
    } else {
      selectedTags = [];
    }

    this.mergeState({ready: true, tags: [], selectedTags: selectedTags, archivedOnly: this.options.archivedOnly});

    if(this.props.noteId) {
      this.note = ModelManager.getInstance().findItem(this.props.noteId);
    }

    // React Native Navigation has an issue where navigation pushes are pushed first, then rendered.
    // This causes an undesired flash while content loads. To reduce the flash, we load the easy stuff first
    // then wait a little to render the rest, such as a dynamic list of tags
    // See https://github.com/wix/react-native-navigation/issues/358

    this.dataLoadObserver = Sync.getInstance().registerInitialDataLoadObserver(function(){
      if(!this.props.singleSelectMode) {
        // Load tags after delay
        setTimeout(function () {
          this.loadTags = true;
          this.forceUpdate();
        }.bind(this), 10);
      } else {
        // Load tags immediately on every render
        this.loadTags = true;
        this.forceUpdate();
      }
    }.bind(this))

    this.syncObserver = Sync.getInstance().registerSyncObserver((changesMade, retreived, saved) => {
      if(retreived && _.find(retreived, {content_type: "Tag"})) {
        console.log("Reloading tags list");
        this.forceUpdate();
      }
    });

  }

  componentWillUnmount() {
    super.componentWillUnmount();
    App.get().removeApplicationReadyObserver(this.readyObserver);
    Sync.getInstance().removeDataLoadObserver(this.dataLoadObserver);
    Sync.getInstance().removeSyncObserver(this.syncObserver);
  }

  notifyParentOfOptionsChange() {
    this.props.onOptionsChange(this.options);

    if(App.isAndroid && this.props.singleSelectMode) {
      this.props.navigator.toggleDrawer({
        side: 'left', // the side of the drawer since you can have two, 'left' / 'right'
        animated: true, // does the toggle have transition animation or does it happen immediately (optional)
        to: 'closed' // optional, 'open' = open the drawer, 'closed' = close it, missing = the opposite of current state
      });
    }
  }

  // on iOS, declaring nav bar buttons as static prevents the flickering issue that occurs on nav push

  static navigatorButtons = Platform.OS == 'android' ? {} : {
    rightButtons: [{
      title: 'New Tag',
      id: 'new-tag',
      showAsAction: 'ifRoom',
    }]
  };

  configureNavBar() {
    super.configureNavBar();

    var leftButtons = [];
    if(!this.note || Platform.OS == "android") {
      // tags only means we're presenting horizontally, only want left button on modal
      leftButtons.push({
        title: 'Done',
        id: 'accept',
        showAsAction: 'ifRoom',
        buttonFontWeight: "bold",
        buttonFontSize: 17
      })
    }
    var rightButton = {
      title: 'New Tag',
      id: 'new-tag',
      showAsAction: 'ifRoom',
    };

    if(Platform.OS === "android") {
      rightButton.icon = Icons.getIcon("md-pricetag");
    }

    this.props.navigator.setButtons({
      rightButtons: [rightButton],
      leftButtons: leftButtons,
      animated: false
    });
  }

  onNavigatorEvent(event) {

    super.onNavigatorEvent(event);

    if(event.id == "willAppear") {
      this.forceUpdate();
    }

    if(event.id == "willDisappear" && !this.props.singleSelectMode) {
      // we prefer to notify the parent via NavBarButtonPress.accept, but when this view is presented via nav push,
      // the user can swipe back and miss that. So we do it here as a backup
      if(!this.didNotifyParent) {
        this.notifyParentOfOptionsChange();
      }
    }

    if (event.type == 'NavBarButtonPress') { // this is the event type for button presses
      if (event.id == 'accept') { // this is the same id field from the static navigatorButtons definition
        if(this.note) {
          this.props.navigator.pop();
        } else {
          this.didNotifyParent = true;
          this.notifyParentOfOptionsChange();
          this.props.navigator.dismissModal({animationType: "slide-down"})
        }
      } else if(event.id == 'new-tag') {
        this.props.navigator.showModal({
          screen: 'sn.InputModal',
          title: 'New Tag',
          animationType: 'slide-up',
          passProps: {
            title: 'New Tag',
            placeholder: "New tag name",
            onSave: (text) => {
              this.createTag(text, function(tag){
                if(this.note) {
                  // select this tag
                  this.onTagSelect(tag)
                }
              }.bind(this));
            }
          }
        });
      }
    }
  }

  createTag(text, callback) {
    var tag = new Tag({title: text});
    tag.initUUID().then(() => {
      tag.setDirty(true);
      ModelManager.getInstance().addItem(tag);
      Sync.getInstance().sync();
      callback(tag);
      this.forceUpdate();
    })
  }

  onSortChange = (key) => {
    this.options.setSortBy(key);
    if(this.props.singleSelectMode) {
      this.notifyParentOfOptionsChange();
    }
  }

  onTagSelect = (tag) => {
    var selectedTags;

    if(this.props.singleSelectMode) {
      selectedTags = [tag.uuid];
    } else {
      selectedTags = this.state.selectedTags;
      var selected = selectedTags.includes(tag.uuid);
      if(selected) {
        // deselect
        selectedTags.splice(selectedTags.indexOf(tag.uuid), 1);
      } else {
        // select
        selectedTags.push(tag.uuid);
      }
    }

    this.selectedTags = selectedTags.slice();
    this.options.setSelectedTags(selectedTags);
    this.mergeState({selectedTags: selectedTags});

    if(this.props.singleSelectMode) {
      this.notifyParentOfOptionsChange();
    }
  }

  onTagLongPress = (tag) => {
    if(this.willBeVisible == false) {
      return;
    }
    AlertManager.showConfirmationAlert(
      "Delete Tag", "Long pressing on a tag presents this option. Are you sure you want to delete this tag?", "Delete",
      function(){
        // confirm
        this.deleteTag(tag);
      }.bind(this)
    )
  }

  isTagSelected(tag) {
    return this.tags.indexOf(tag.uuid) !== -1;
  }

  deleteTag = (tag) => {
    ModelManager.getInstance().setItemToBeDeleted(tag);
    Sync.getInstance().sync(function(){
      this.setState(function(prevState){
        return _.merge(prevState, {tags : prevState.tags});
      })
    }.bind(this));
  }

  onManageNoteEvent(event) {
    if(event == "delete") {
      AlertManager.showConfirmationAlert(
        "Delete Note", "Are you sure you want to delete this note?", "Delete",
        function(){
          ModelManager.getInstance().setItemToBeDeleted(this.note);
          Sync.getInstance().sync();
          this.props.navigator.popToRoot({
            animated: true,
          });
        }.bind(this)
      )
    } else if(event == "pin" || event == "unpin") {
      this.note.setAppDataItem("pinned", event == "pin");
      this.note.setDirty(true);
    } else if(event == "archive" || event == "unarchive") {
      this.note.setAppDataItem("archived", event == "archive");
      this.note.setDirty(true);
    } else if(event == "share") {
      Share.share({
        title: this.note.title,
        message: this.note.text,
      })
    }
  }

  onArchiveSelect = () => {
    this.options.setArchivedOnly(!this.options.archivedOnly);
    this.mergeState({archivedOnly: this.options.archivedOnly});

    if(this.props.singleSelectMode) {
      this.notifyParentOfOptionsChange();
    }
  }

  render() {
    if(!this.state.ready || this.state.lockContent) {
      // console.log("Render Locked Filter content");
      return (<View></View>);
    }

    console.log("Render regular Filter content");

    if(this.loadTags) {
      var tags = ModelManager.getInstance().tags.slice();
      if(this.props.singleSelectMode) {
        tags.unshift({title: "All notes", key: "all", uuid: 100})
      }
      this.tags = tags;
    }

    var viewStyles = [GlobalStyles.styles().container];
    if(App.isAndroid && this.props.singleSelectMode) {
      // See https://github.com/wix/react-native-navigation/issues/1942
      var {height, width} = Dimensions.get('window');
      var drawerWidth = Math.min(width * 0.8, 450);
      viewStyles.push({width: drawerWidth});
    }

    return (
      <View style={viewStyles}>
        <ScrollView style={GlobalStyles.styles().view}>

          {!this.note &&
            <SortSection sortBy={this.options.sortBy} onSortChange={this.onSortChange} title={"Sort By"} />
          }

          {!this.note &&
            <OptionsSection archivedOnly={this.state.archivedOnly} onArchiveSelect={this.onArchiveSelect} title={"Options"} />
          }

          { this.note &&
              <ManageNote note={this.note} title={"Manage Note"} onEvent={this.onManageNoteEvent.bind(this)}/>
          }

          <TagsSection
            tags={this.tags}
            selected={this.state.selectedTags}
            onTagSelect={this.onTagSelect}
            onTagLongPress={this.onTagLongPress}
            title={"Tags"}
           />

        </ScrollView>
      </View>
    );
  }
}


class TagsSection extends Component {
  constructor(props) {
    super(props);
    this.state = {selected: props.selected};
  }

  onPress = (tag) => {
    this.props.onTagSelect(tag);
  }

  onLongPress = (tag) => {
    this.props.onTagLongPress(tag);
  }

  // must pass title, text, and tags as props so that it re-renders when either of those change
  _renderItem = ({item}) => (
    <SectionedAccessoryTableCell
      onPress={() => {this.onPress(item)}}
      onLongPress={() => this.onLongPress(item)}
      text={item.title}
      key={item.uuid}
      first={this.props.tags.indexOf(item) == 0}
      selected={() => {return this.state.selected.includes(item.uuid)}}
    />
  )

  render() {
    return (
      <TableSection style={GlobalStyles.styles().view}>
        <SectionHeader title={this.props.title} />

        <FlatList style={{height: "100%"}}
          initialNumToRender={6}
          windowSize={6}
          maxToRenderPerBatch={6}
          data={this.props.tags}
          renderItem={this._renderItem}
        />

      </TableSection>
    );
  }
}

class OptionsSection extends Component {
  constructor(props) {
    super(props);
    this.state = {archivedOnly: props.archivedOnly}
  }

  onPressArchive = () => {
    this.props.onArchiveSelect();
  }

  render() {
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        <SectionedAccessoryTableCell
          onPress={this.onPressArchive}
          text={"Show only archived notes"}
          first={true}
          selected={() => {return this.props.archivedOnly}}
        />

      </TableSection>
    );
  }
}

class SortSection extends Component {
  constructor(props) {
    super(props);
    this.state = {sortBy: props.sortBy}
    this.options = [
      {key: "created_at", label: "Created date"},
      {key: "updated_at", label: "Modified date"},
      {key: "title", label: "Title"},
    ];
  }

  onPress = (key) => {
    this.setState({sortBy: key});
    this.props.onSortChange(key);
  }

  render() {
    let root = this;
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />
        {this.options.map(function(option, i){
          return (
            <SectionedAccessoryTableCell
              onPress={() => {root.onPress(option.key)}}
              text={option.label}
              key={option.key}
              first={i == 0}
              selected={() => {return option.key == root.state.sortBy}}
            />
          )
        })}

      </TableSection>
    );
  }
}

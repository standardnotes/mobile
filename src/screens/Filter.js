import React, { Component } from 'react';
import { TextInput, SectionList, ScrollView, View, Text, Share, Platform } from 'react-native';
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

import GlobalStyles from "../Styles"

export default class Filter extends Abstract {

  constructor(props) {
    super(props);
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
    this.options = Object.assign({}, props.options);

    var selectedTags ;
    if(this.options.selectedTags) {
      selectedTags = props.options.selectedTags.slice(); // copy the array
    } else {
      selectedTags = [];
    }
    this.state = {tags: [], selectedTags: selectedTags};

    if(this.props.noteId) {
      this.note = ModelManager.getInstance().findItem(this.props.noteId);
    }

    this.configureNavBar();
  }

  componentDidMount() {
    // React Native Navigation has an issue where navigation pushes are pushed first, then rendered.
    // This causes an undesired flash while content loads. To reduce the flash, we load the easy stuff first
    // then wait a little to render the rest, such as a dynamic list of tags
    // See https://github.com/wix/react-native-navigation/issues/358
    setTimeout(function () {
      this.mergeState({tags: ModelManager.getInstance().tags});
    }.bind(this), 10);
  }

  configureNavBar() {
    super.configureNavBar();

    var leftButtons = [];
    if(!this.note || Platform.OS == "android") {
      // tags only means we're presenting horizontally, only want left button on modal
      leftButtons.push({
        title: 'Done',
        id: 'accept',
        showAsAction: 'ifRoom',
        buttonColor: GlobalStyles.constants().mainTintColor,
        buttonFontWeight: "bold",
        buttonFontSize: 17
      })
    }
    var rightButton = {
      title: 'New Tag',
      id: 'new-tag',
      showAsAction: 'ifRoom',
      buttonColor: GlobalStyles.constants().mainTintColor,
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

    if (event.type == 'NavBarButtonPress') { // this is the event type for button presses
      if (event.id == 'accept') { // this is the same id field from the static navigatorButtons definition
        if(this.note) {
          this.props.navigator.pop();
        } else {
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
    tag.initUUID().then(function() {
      tag.setDirty(true);
      ModelManager.getInstance().addItem(tag);
      Sync.getInstance().sync();
      callback(tag);
    })
  }

  onSortChange = (key) => {
    this.options.sortBy = key;
    this.props.onOptionsChange(this.options);
  }

  onTagSelect = (tag) => {
    var selectedTags = this.state.selectedTags;
    var selected = selectedTags.includes(tag.uuid);

    if(selected) {
      // deselect
      selectedTags.splice(selectedTags.indexOf(tag.uuid), 1);
    } else {
      // select
      selectedTags.push(tag.uuid);
    }
    this.selectedTags = selectedTags.slice();
    this.options.selectedTags = selectedTags;
    this.state.selectedTags = selectedTags;
    this.props.onOptionsChange(this.options);
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

  onOptionsChange = (options) => {
    _.merge(this.options, options);
    this.props.onOptionsChange(this.options);
  }

  render() {
    return (
      <View style={GlobalStyles.styles().container}>
        <ScrollView style={GlobalStyles.styles().view}>

          {!this.note &&
            <SortSection sortBy={this.options.sortBy} onSortChange={this.onSortChange} title={"Sort By"} />
          }

          {!this.note &&
            <OptionsSection options={this.options} onOptionsChange={this.onOptionsChange} title={"Options"} />
          }

          { this.note &&
              <ManageNote note={this.note} title={"Manage Note"} onEvent={this.onManageNoteEvent.bind(this)}/>
          }

          <TagsSection
            tags={this.state.tags}
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

  render() {
    let root = this;
    return (
      <TableSection style={GlobalStyles.styles().view}>
        <SectionHeader title={this.props.title} />
        {this.props.tags.map(function(tag, i){
          return (
            <SectionedAccessoryTableCell
              onPress={() => {root.onPress(tag)}}
              onLongPress={() => root.onLongPress(tag)}
              text={tag.title}
              key={tag.uuid}
              first={i == 0}
              selected={() => {return root.state.selected.includes(tag.uuid)}}
              buttonCell={true}
            />
          )
        })}


      </TableSection>
    );
  }
}

class OptionsSection extends Component {
  constructor(props) {
    super(props);
    this.state = {options: props.options}
  }

  onPressArchive = () => {
    this.setState(function(prevState){
      var state = prevState;
      state.options.archivedOnly = !state.options.archivedOnly;
      this.props.onOptionsChange(state.options);
      return state;
    }.bind(this))
  }

  render() {
    let root = this;
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        <SectionedAccessoryTableCell
          onPress={root.onPressArchive}
          text={"Show only archived notes"}
          first={true}
          selected={() => {return root.state.options.archivedOnly}}
          buttonCell={true}
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
              buttonCell={true}
            />
          )
        })}

      </TableSection>
    );
  }
}

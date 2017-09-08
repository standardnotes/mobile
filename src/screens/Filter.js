import React, { Component } from 'react';
import { TextInput, SectionList, ScrollView, View, Text } from 'react-native';

import Sync from '../lib/sync'
import ModelManager from '../lib/modelManager'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";

import Tag from "../models/app/tag"

import GlobalStyles from "../Styles"

export default class Filter extends Component {

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

    this.state = {tags: ModelManager.getInstance().tags, selectedTags: selectedTags};

    var leftButtons = [];
    if(!this.props.forNoteTags) {
      // tags only means we're presenting horizontally, only want left button on modal
      leftButtons.push({
        title: 'Done',
        id: 'accept',
        showAsAction: 'ifRoom',
        buttonColor: GlobalStyles.constants.mainTintColor,
        buttonFontWeight: "bold",
        buttonFontSize: 17
      })
    }

    this.props.navigator.setButtons({
      rightButtons: [
        {
          title: 'New Tag',
          id: 'new-tag',
          showAsAction: 'ifRoom',
          buttonColor: GlobalStyles.constants.mainTintColor,
        },
      ],
      leftButtons: leftButtons,
      animated: false
    });
  }

  onNavigatorEvent(event) {
    // console.log("Navigator event", event);
    switch(event.id) {
      case 'willAppear':
       this.forceUpdate();
       break;
      case 'didAppear':
        break;
      case 'willDisappear':
        break;
      case 'didDisappear':
        break;
      }

      if (event.type == 'NavBarButtonPress') { // this is the event type for button presses
        if (event.id == 'accept') { // this is the same id field from the static navigatorButtons definition
          this.props.navigator.dismissModal({animationType: "slide-down"})
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
                  if(this.props.forNoteTags) {
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
    tag.init(function(){
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

  isTagSelected(tag) {
    return this.tags.indexOf(tag.uuid) !== -1;
  }

  shouldDisplaySortSection() {
    if(this.props.forNoteTags) {
      return false;
    }
    return true;
  }

  render() {

    return (
      <View style={GlobalStyles.rules.container}>
        <ScrollView>
          {this.shouldDisplaySortSection() &&
            <SortSection sortBy={this.options.sortBy} onSortChange={this.onSortChange} title={"Sort By"} />
          }
          <TagsSection tags={this.state.tags} selected={this.state.selectedTags} onTagSelect={this.onTagSelect} title={"Tags"} />

        </ScrollView>
      </View>
    );
  }
}

class TagsSection extends Component {
  constructor(props) {
    super(props);
  }

  onPress = (tag) => {
    // this.setState(function(prevState){
      this.props.onTagSelect(tag);
      this.forceUpdate();
      // this.setState(function(prevState){
      //   return Object.assign({tags: this.props.tags, selected: this.props.selected});
      // }.bind(this))
      // return state;
    // }.bind(this))
  }

  accessoryForTag(tag) {

    if(this.props.selected.includes(tag.uuid)) {
      return "chosen";
    } else {
      return "not-chosen";
    }
  }

  render() {
    let root = this;
    console.log("Rendering tags with selected", this.props.selected);
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />
        {this.props.tags.map(function(tag, i){
          return (
            <SectionedAccessoryTableCell
              onPress={() => {root.onPress(tag)}}
              text={tag.title}
              key={tag.uuid}
              selected={root.props.selected.includes(tag.uuid)}
              first={i == 0}
              accessory={root.accessoryForTag(tag)}
              buttonCell={true}
            />
          )
        })}


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

  accessoryForKey(key) {
    if(key == this.state.sortBy) {
      return "chosen";
    } else {
      return "not-chosen";
    }
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
              accessory={root.accessoryForKey(option.key)}
              buttonCell={true}
            />
          )
        })}

      </TableSection>
    );
  }
}

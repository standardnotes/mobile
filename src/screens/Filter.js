import React, { Component } from 'react';
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import ModelManager from '../lib/modelManager'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";

import GlobalStyles from "../Styles"

import {
  TextInput,
  SectionList,
  ScrollView,
  View,
  Text
} from 'react-native';

export default class Filter extends Component {

  constructor(props) {
    super(props);
    this.state = {tags: ModelManager.getInstance().tags};
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
    this.options = Object.assign({}, props.options);
    this.selectedTags = props.options.selectedTags.slice(); // copy the array

    this.props.navigator.setButtons({
      rightButtons: [
        {
          title: 'New Tag', // for a textual button, provide the button title (label)
          id: 'new-tag', // id for this button, given in onNavigatorEvent(event) to help understand which button was clicked
          showAsAction: 'ifRoom', // optional, Android only. Control how the button is displayed in the Toolbar. Accepted valued: 'ifRoom' (default) - Show this item as a button in an Action Bar if the system decides there is room for it. 'always' - Always show this item as a button in an Action Bar. 'withText' - When this item is in the action bar, always show it with a text label even if it also has an icon specified. 'never' - Never show this item as a button in an Action Bar.
          buttonColor: GlobalStyles.constants.mainTintColor, // Optional, iOS only. Set color for the button (can also be used in setButtons function to set different button style programatically)
        },
      ],
      leftButtons: [
        {
          title: 'Done', // for a textual button, provide the button title (label)
          id: 'done', // id for this button, given in onNavigatorEvent(event) to help understand which button was clicked
          showAsAction: 'ifRoom', // optional, Android only. Control how the button is displayed in the Toolbar. Accepted valued: 'ifRoom' (default) - Show this item as a button in an Action Bar if the system decides there is room for it. 'always' - Always show this item as a button in an Action Bar. 'withText' - When this item is in the action bar, always show it with a text label even if it also has an icon specified. 'never' - Never show this item as a button in an Action Bar.
          buttonColor: GlobalStyles.constants.mainTintColor, // Optional, iOS only. Set color for the button (can also be used in setButtons function to set different button style programatically)
          buttonFontWeight: "bold",
          buttonFontSize: 17
        },
      ],
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
        if (event.id == 'done') { // this is the same id field from the static navigatorButtons definition
          this.props.navigator.dismissModal({animationType: "slide-down"})
        }

      }
  }

  onSortChange = (key) => {
    this.options.sortBy = key;
    this.props.onOptionsChange(this.options);
  }

  onTagSelect = (tag, selected) => {
    console.log("Selected tag", tag, selected);
    var selectedTags = this.selectedTags || [];
    if(!selected) {
      selectedTags.splice(selectedTags.indexOf(tag.uuid), 1);
    } else {
      selectedTags.push(tag.uuid);
    }
    this.options.selectedTags = selectedTags;
    this.props.onOptionsChange(this.options);
  }

  isTagSelected(tag) {
    return this.tags.indexOf(tag.uuid) !== -1;
  }

  render() {

    return (
      <View style={GlobalStyles.rules.container}>
        <ScrollView>

          <SortSection sortBy={this.options.sortBy} onSortChange={this.onSortChange} title={"Sort By"} />
          <TagsSection tags={this.state.tags} selected={this.selectedTags} onTagSelect={this.onTagSelect} title={"Tags"} />

        </ScrollView>
      </View>
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

class TagsSection extends Component {
  constructor(props) {
    super(props);
    console.log("Loading tags section with tags", props.tags);
    this.state = {tags: props.tags, selected: props.selected}
  }

  onPress = (tag) => {
    this.setState(function(prevState){
      var state = Object.assign({}, prevState);
      var selected = state.selected;
      var isSelected;
      if(selected.includes(tag.uuid)) {
        isSelected = false;
        selected.splice(selected.indexOf(tag.uuid), 1);
      } else {
        isSelected = true;
        selected.push(tag.uuid);
      }

      this.props.onTagSelect(tag, isSelected);
      return state;
    }.bind(this))
  }

  accessoryForTag(tag) {

    if(this.state.selected.includes(tag.uuid)) {
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
        {this.state.tags.map(function(tag, i){
          return (
            <SectionedAccessoryTableCell
              onPress={() => {root.onPress(tag)}}
              text={tag.title}
              key={tag.uuid}
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

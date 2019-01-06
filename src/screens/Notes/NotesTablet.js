import React, { Component } from 'react';
import { View, Text, Alert } from 'react-native';

import SideMenuManager from "@SideMenu/SideMenuManager"

import Abstract from "@Screens/Abstract"
import Notes from "@Screens/Notes/Notes"
import Compose from "@Screens/Compose"
import LockedView from "@Containers/LockedView"

import StyleKit from "@Style/StyleKit"

export default class NotesTablet extends Abstract {

  constructor(props) {
    super(props);
  }

  onNoteSelect = (note) => {
    this.composer.setNote(note);
    this.setState({selectedTagId: this.notesRef.options.selectedTagIds.length && this.notesRef.options.selectedTagIds[0]});
  }

  render() {
    if(this.state.lockContent) {
      return <LockedView />;
    }

    return (
      <View style={[StyleKit.styles.container, this.styles.root]}>

        <View style={this.styles.left}>
          <Notes ref={(ref) => {this.notesRef = ref}}  navigation={this.props.navigation} onNoteSelect={this.onNoteSelect} />
        </View>

        <View style={this.styles.right}>
          <Compose
            ref={(ref) => {this.composer = ref}}
            selectedTagId={this.state.selectedTagId}
            navigation={this.props.navigation}
          />
        </View>
      </View>
    );
  }

  loadStyles() {
    this.styles = {
      root: {
        flex: 1,
        flexDirection: "row"
      },
      left: {
        width: "34%",
        borderRightColor: StyleKit.variables.stylekitBorderColor,
        borderRightWidth: 1
      },
      right: {
        width: "66%"
      }
    }
  }
}

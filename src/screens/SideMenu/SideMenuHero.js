import React, { Component } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Auth from "@SFJS/authManager"
import KeysManager from "@Lib/keysManager"
import ModelManager from "@SFJS/modelManager"

import StyleKit from "@Style/StyleKit"
import ThemedComponent from "@Components/ThemedComponent";
import Circle from "@Components/Circle"


export default class SideMenuHero extends ThemedComponent {

  getText() {
    let offline = Auth.get().offline();
    let hasEncryption = !offline || KeysManager.get().isStorageEncryptionEnabled();
    if(offline) {
      return {
        title: "Data Not Backed Up",
        text: hasEncryption ?
          "Sign in or register to enable sync to your other devices." :
          "Sign in or register to add encryption and enable sync to your other devices."
      }
    } else {
      let email = KeysManager.get().getUserEmail();
      var items = ModelManager.get().allItemsMatchingTypes(["Note", "Tag"]);
      var itemsStatus = items.length + "/" + items.length + " notes and tags encrypted";
      return {
        title: email,
        text: itemsStatus
      }
    }
  }

  render() {
    let textData = this.getText();
    return (
      <View style={[this.styles.cell]}>
        <TouchableOpacity onPress={this.props.onPress}>
          <Text style={this.styles.title}>{textData.title}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={this.props.onPress}>
          <Text style={this.styles.subtitle}>{textData.text}</Text>
        </TouchableOpacity>

        {this.props.outOfSync &&
          <TouchableOpacity style={this.styles.outOfSyncContainer} onPress={this.props.onOutOfSyncPress}>
            <View style={this.styles.iconCircle}>
              <Circle size={10} backgroundColor={StyleKit.variables.stylekitWarningColor} borderColor={StyleKit.variables.stylekitWarningColor} />
            </View>
            <Text style={this.styles.outOfSync}>Potentially Out of Sync</Text>
          </TouchableOpacity>
        }
      </View>
    )
  }

  loadStyles() {
    this.styles = {
      cell: {
        backgroundColor: StyleKit.variables.stylekitContrastBackgroundColor,
        borderBottomColor: StyleKit.variables.stylekitContrastBorderColor,
        borderBottomWidth: 1,
        padding: 15,
        paddingTop: 10,
        paddingBottom: 12,
        paddingRight: 25,
      },

      title: {
        fontWeight: "bold",
        fontSize: 16,
        color: StyleKit.variables.stylekitContrastForegroundColor,
        marginBottom: 3,
      },

      subtitle: {
        fontSize: 13,
        color: StyleKit.variables.stylekitContrastForegroundColor,
        opacity: 0.6
      },

      outOfSyncContainer: {
        flex: 0,
        flexDirection: 'row',
        alignItems: "center"
      },

      iconCircle: {
        marginTop: 10,
        width: 15,
      },

      outOfSync: {
        marginTop: 10,
        fontSize: 13,
        color: StyleKit.variables.stylekitWarningColor,
        fontWeight: "bold"
      }
    }
  }
}

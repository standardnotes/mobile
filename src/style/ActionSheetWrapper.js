import React, {Component} from 'react';
import { StyleSheet, StatusBar, Alert, Platform, Dimensions } from 'react-native';
import Icons from '@Style/Icons';
import StyleKit from "@Style/StyleKit"
import ActionSheet from 'react-native-actionsheet'

export default class ActionSheetWrapper {

  static BuildOption({text, key, callback, destructive}) {
    return {
      text,
      key,
      callback,
      destructive
    }
  }

  constructor({title, options, onCancel}) {
    options.push({text: "Cancel", callback: onCancel});
    this.options = options;

    this.destructiveIndex = this.options.indexOf(this.options.find((candidate) => {
      return candidate.destructive;
    }))
    this.cancelIndex = this.options.length - 1;
    this.title = title;
  }

  show() {
    this.actionSheet.show();
  }

  handleActionSheetPress = (index) => {
    console.log("handleActionSheetPress", index);

    let option = this.options[index];
    option.callback && option.callback(option);
  }

  actionSheetElement() {
    return (
      <ActionSheet
        ref={o => this.actionSheet = o}
        title={this.title}
        options={this.options.map((option) => {return option.text})}
        cancelButtonIndex={this.cancelIndex}
        destructiveButtonIndex={this.destructiveIndex}
        onPress={this.handleActionSheetPress}
        {...StyleKit.actionSheetStyles()}
      />
    )
  }

}

import React from 'react';
import { StyleSheet } from 'react-native';
import ActionSheet from 'react-native-actionsheet';
import ApplicationState from 'lib/ApplicationState';
import StyleKit from 'style/StyleKit';

export default class ActionSheetWrapper {
  static BuildOption({ text, key, callback, destructive }) {
    return {
      text,
      key,
      callback,
      destructive,
    };
  }

  constructor({ title, options, onCancel }) {
    options.push({ text: 'Cancel', callback: onCancel });
    this.options = options;

    this.destructiveIndex = this.options.indexOf(
      this.options.find(candidate => {
        return candidate.destructive;
      })
    );
    this.cancelIndex = this.options.length - 1;
    this.title = title;
  }

  show() {
    this.actionSheet.show();
  }

  handleActionSheetPress = index => {
    let option = this.options[index];
    option.callback && option.callback(option);
  };

  actionSheetElement() {
    return (
      <ActionSheet
        ref={o => (this.actionSheet = o)}
        title={this.title}
        options={this.options.map(option => {
          return option.text;
        })}
        cancelButtonIndex={this.cancelIndex}
        destructiveButtonIndex={this.destructiveIndex}
        onPress={this.handleActionSheetPress}
        {...ActionSheetWrapper.actionSheetStyles()}
      />
    );
  }

  static actionSheetStyles() {
    return {
      wrapperStyle: StyleKit.styles.actionSheetWrapper,
      overlayStyle: StyleKit.styles.actionSheetOverlay,
      bodyStyle: StyleKit.styles.actionSheetBody,

      buttonWrapperStyle: StyleKit.styles.actionSheetButtonWrapper,
      buttonTitleStyle: StyleKit.styles.actionSheetButtonTitle,

      titleWrapperStyle: StyleKit.styles.actionSheetTitleWrapper,
      titleTextStyle: StyleKit.styles.actionSheetTitleText,
      tintColor: ApplicationState.isIOS
        ? undefined
        : StyleKit.variables.stylekitInfoColor,

      buttonUnderlayColor: StyleKit.variables.stylekitBorderColor,

      cancelButtonWrapperStyle: StyleKit.styles.actionSheetCancelButtonWrapper,
      cancelButtonTitleStyle: StyleKit.styles.actionSheetCancelButtonTitle,
      cancelMargin: StyleSheet.hairlineWidth,
    };
  }
}

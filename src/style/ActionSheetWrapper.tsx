import React from 'react';
import { StyleSheet } from 'react-native';
import ActionSheet from 'react-native-actionsheet';
import ApplicationState from '@Lib/ApplicationState';
import StyleKit from '@Style/StyleKit';

type Option =
  | {
      text: string;
      key?: string;
      callback: () => void;
      destructive?: boolean;
    }
  | {
      text: string;
      key?: string;
      callback: (option: Option) => void;
      destructive?: boolean;
    };

export default class ActionSheetWrapper {
  options: Option[];
  destructiveIndex?: number;
  cancelIndex: number;
  title: string;
  actionSheet = React.createRef<ActionSheet>();
  static BuildOption({ text, key, callback, destructive }: Option) {
    return {
      text,
      key,
      callback,
      destructive,
    };
  }

  constructor(props: {
    title: string;
    options: Option[];
    onCancel: () => void;
  }) {
    const cancelOption: Option[] = [
      {
        text: 'Cancel',
        callback: props.onCancel,
        key: 'CancelItem',
        destructive: false,
      },
    ];
    this.options = props.options.concat(cancelOption);

    this.destructiveIndex = this.options.findIndex(item => item.destructive);
    this.cancelIndex = this.options.length - 1;
    this.title = props.title;
  }

  show() {
    this.actionSheet.current?.show();
  }

  handleActionSheetPress = (index: number) => {
    let option = this.options[index];
    option.callback && option.callback(option);
  };

  actionSheetElement() {
    return (
      <ActionSheet
        ref={this.actionSheet}
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

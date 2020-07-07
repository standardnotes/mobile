import { useActionSheet } from '@expo/react-native-action-sheet';
import { useContext } from 'react';
import { ThemeContext } from 'styled-components/native';

type Option =
  | {
      text: string;
      key?: string;
      callback?: () => void;
      destructive?: boolean;
    }
  | {
      text: string;
      key?: string;
      callback?: (option: Option) => void;
      destructive?: boolean;
    };

export const createActionSheetOptions = () => {};

export const useCustomActionSheet = () => {
  const { showActionSheetWithOptions } = useActionSheet();
  const theme = useContext(ThemeContext);

  const showActionSheet = (
    title: string,
    options: Option[],
    onCancel?: () => void
  ) => {
    const cancelOption: Option[] = [
      {
        text: 'Cancel',
        callback: onCancel || (() => {}),
        key: 'CancelItem',
        destructive: false,
      },
    ];
    const tempOptions = options.concat(cancelOption);
    const destructiveIndex = tempOptions.findIndex(item => item.destructive);
    const cancelIndex = tempOptions.length - 1;

    showActionSheetWithOptions(
      {
        options: tempOptions.map(option => option.text),
        destructiveButtonIndex: destructiveIndex,
        cancelButtonIndex: cancelIndex,
        title,
        containerStyle: {
          backgroundColor: theme.stylekitBorderColor,
        },
        textStyle: {
          color: theme.stylekitForegroundColor,
        },
        titleTextStyle: {
          color: theme.stylekitForegroundColor,
        },
      },
      buttonIndex => {
        let option = tempOptions[buttonIndex];
        option.callback && option.callback(option);
      }
    );
  };

  return { showActionSheet };
};

import { Alert, AlertButton } from 'react-native';
import { ButtonType, DismissBlockingDialog, SNAlertService } from 'snjs';

export class AlertService implements SNAlertService {
  blockingDialog(_text: string): DismissBlockingDialog {
    throw new Error('Method not implemented.');
  }
  alert(text: string, title: string, closeButtonText?: string) {
    return new Promise<void>(resolve => {
      // On iOS, confirm should go first. On Android, cancel should go first.
      let buttons = [
        {
          text: closeButtonText,
          onPress: async () => {
            resolve();
          },
        },
      ];
      Alert.alert(title, text, buttons, {
        cancelable: true,
      });
    });
  }

  confirm(
    text: string,
    title: string,
    confirmButtonText = 'Confirm',
    confirmButtonType?: ButtonType,
    cancelButtonText = 'Cancel'
  ) {
    return new Promise<boolean>((resolve, reject) => {
      // On iOS, confirm should go first. On Android, cancel should go first.
      let buttons: AlertButton[] = [
        {
          text: cancelButtonText,
          style: 'cancel',
          onPress: async () => {
            resolve(false);
          },
        },
        {
          text: confirmButtonText,
          style:
            confirmButtonType === ButtonType.Danger ? 'destructive' : 'default',
          onPress: async () => {
            resolve(true);
          },
        },
      ];
      Alert.alert(title, text, buttons, {
        cancelable: true,
        onDismiss: async () => {
          reject(false);
        },
      });
    });
  }
}

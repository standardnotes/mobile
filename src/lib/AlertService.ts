import { Alert } from 'react-native';
import { SNAlertService } from 'snjs';

export class AlertService extends SNAlertService {
  async alert(
    title: string,
    text: string,
    closeButtonText?: string,
    onClose?: () => void
  ) {
    return new Promise(resolve => {
      // On iOS, confirm should go first. On Android, cancel should go first.
      let buttons = [
        {
          text: closeButtonText,
          onPress: async () => {
            if (onClose) {
              onClose();
            }
            resolve();
          },
        },
      ];
      Alert.alert(title, text, buttons, {
        cancelable: true,
      });
    });
  }

  async confirm(
    text: string,
    title: string,
    confirmButtonText = 'Confirm',
    cancelButtonText = 'Cancel',
    onConfirm: () => void,
    onCancel: () => void,
    _destructive = false
  ) {
    return new Promise((resolve, reject) => {
      // On iOS, confirm should go first. On Android, cancel should go first.
      let buttons = [
        {
          text: cancelButtonText,
          onPress: async () => {
            if (onCancel) {
              onCancel();
            }
            reject();
          },
        },
        {
          text: confirmButtonText,
          onPress: async () => {
            if (onConfirm) {
              onConfirm();
            }
            resolve();
          },
        },
      ];
      Alert.alert(title, text, buttons, {
        cancelable: true,
        onDismiss: async () => {
          // TODO: check alerts
          // if (onDismiss) {
          //   onDismiss();
          // }
          reject();
        },
      });
    });
  }
}

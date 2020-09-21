import { MODAL_BLOCKING_ALERT } from '@Screens/screens';
import { Alert, AlertButton } from 'react-native';
import { ButtonType, DismissBlockingDialog, SNAlertService } from 'snjs';
import { goBack, navigate } from './NavigationService';

export class AlertService implements SNAlertService {
  blockingDialog(
    text: string,
    title?: string
  ): DismissBlockingDialog | Promise<DismissBlockingDialog> {
    navigate(MODAL_BLOCKING_ALERT, { text, title });

    return goBack;
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

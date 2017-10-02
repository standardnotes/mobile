import { Alert } from 'react-native';
import App from "../app"

export default class AlertManager {

  static showConfirmationAlert(title, message, confirmationTitle, onConfirm, onCancel) {
    // On iOS, confirm should go first. On Android, cancel should go first.
    let buttons = App.isIOS ? [
      {text: confirmationTitle, onPress: onConfirm},
      {text: 'Cancel', onPress: onCancel},
    ] : [
      {text: 'Cancel', onPress: onCancel},
      {text: confirmationTitle, onPress: onConfirm},
    ];
    Alert.alert(
      title,
      message,
      buttons,
      { cancelable: true }
    )
  }

}

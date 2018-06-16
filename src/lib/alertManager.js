import { Alert } from 'react-native';
import App from "../app"

export default class AlertManager {

  static confirm(title, message, confirmButtonText = "OK", onConfirm, onCancel) {
    // On iOS, confirm should go first. On Android, cancel should go first.
    let buttons = [
      {text: 'Cancel', onPress: onCancel},
      {text: confirmButtonText, onPress: onConfirm},
    ];
    Alert.alert(
      title,
      message,
      buttons,
      { cancelable: true }
    )
  }

}

import { Alert } from 'react-native';
import App from "../../app"

export default class AlertManager extends SFAlertManager {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new AlertManager();
    }

    return this.instance;
  }

  confirm({title, text, confirmButtonText = "OK", onConfirm, onCancel} = {}) {
    // On iOS, confirm should go first. On Android, cancel should go first.
    let buttons = [
      {text: 'Cancel', onPress: onCancel},
      {text: confirmButtonText, onPress: onConfirm},
    ];
    Alert.alert(
      title,
      text,
      buttons,
      { cancelable: true }
    )
  }

}

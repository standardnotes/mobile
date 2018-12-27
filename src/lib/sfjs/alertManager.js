import { Alert } from 'react-native';

export default class AlertManager extends SFAlertManager {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new AlertManager();
    }

    return this.instance;
  }

  async confirm({title, text, confirmButtonText = "OK", onConfirm, onCancel} = {}) {
    return new Promise((resolve, reject) => {
      // On iOS, confirm should go first. On Android, cancel should go first.
      let buttons = [
        {text: 'Cancel', onPress: () => {
          reject();
          onCancel && onCancel();
        }},
        {text: confirmButtonText, onPress: () => {
          resolve();
          onConfirm && onConfirm();
        }},
      ];
      Alert.alert(title, text, buttons, { cancelable: true })
    })
  }

}

import { Alert} from 'react-native';

export default class AlertManager {

  static showConfirmationAlert(title, message, confirmationTitle, onConfirm, onCancel) {
    Alert.alert(
      title,
      message,
      [
        {text: 'Cancel', onPress: onCancel},
        {text: confirmationTitle, onPress: onConfirm},
      ],
      { cancelable: true }
    )
  }

}

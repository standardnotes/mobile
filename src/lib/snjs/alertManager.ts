import { Alert } from 'react-native';

import { SFAlertManager } from 'snjs';

export default class AlertManager extends SFAlertManager {
  private static instance: AlertManager;

  static get() {
    if (!this.instance) {
      this.instance = new AlertManager();
    }

    return this.instance;
  }

  async alert(alertdata: {
    title: string;
    text: string;
    closeButtonText?: string;
    onClose?: () => void | Promise<any>;
  }) {
    return new Promise(resolve => {
      // On iOS, confirm should go first. On Android, cancel should go first.
      let buttons = [
        {
          text: alertdata.closeButtonText,
          onPress: async () => {
            alertdata.onClose && (await alertdata.onClose());
            resolve();
          },
        },
      ];
      Alert.alert(alertdata.title, alertdata.text, buttons, {
        cancelable: true,
      });
    });
  }

  async confirm(confirmData: {
    title: string;
    text?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    onConfirm?: () => void | Promise<any>;
    onCancel?: () => void | Promise<any>;
    onDismiss?: () => void | Promise<any>;
  }) {
    return new Promise((resolve, reject) => {
      // On iOS, confirm should go first. On Android, cancel should go first.
      let buttons = [
        {
          text: confirmData.cancelButtonText,
          onPress: async () => {
            confirmData.onCancel && (await confirmData.onCancel());
            reject();
          },
        },
        {
          text: confirmData.confirmButtonText,
          onPress: async () => {
            confirmData.onConfirm && (await confirmData.onConfirm());
            resolve();
          },
        },
      ];
      Alert.alert(confirmData.title, confirmData.text, buttons, {
        cancelable: true,
        onDismiss: async () => {
          confirmData.onDismiss && (await confirmData.onDismiss());
          reject();
        },
      });
    });
  }
}

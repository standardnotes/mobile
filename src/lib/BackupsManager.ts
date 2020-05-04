import { Share, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import { SFItemParams } from 'snjs';
import ApplicationState from '@Lib/ApplicationState';
import KeysManager from '@Lib/keysManager';
import AlertManager from '@Lib/snjs/alertManager';
import Auth from '@Lib/snjs/authManager';
import ModelManager from '@Lib/snjs/modelManager';

const Mailer = 'react-native-mail';
const base64 = require('base-64');

export default class BackupsManager {
  private static instance: BackupsManager;
  static get() {
    if (!this.instance) {
      this.instance = new BackupsManager();
    }
    return this.instance;
  }

  /*
    On iOS, we can use Share to share a file of arbitrary length.
    This doesn't work on Android however. Seems to have a very low limit.
    For Android, we'll use RNFS to save the file to disk, then FileViewer to
    ask the user what application they would like to open the file with.
    For .txt files, not many applications handle it. So, we'll want to notify the user
    the path the file was saved to.
   */

  async export(encrypted: boolean) {
    const auth_params = await Auth.get().getAuthParams();
    const keys = encrypted ? KeysManager.get().activeKeys() : null;

    const items = [];

    for (const item of ModelManager.get().allItems) {
      const itemParams = new SFItemParams(item, keys, auth_params);
      const params = await itemParams.paramsForExportFile();
      items.push(params);
    }

    if (items.length === 0) {
      Alert.alert('No Data', "You don't have any notes yet.");
      return false;
    }

    const data: { items: any; auth_params?: any } = { items };

    if (keys) {
      const authParams = KeysManager.get().activeAuthParams();
      // auth params are only needed when encrypted with a standard file key
      data.auth_params = authParams;
    }

    const jsonString = JSON.stringify(data, null, 2 /* pretty print */);
    const modifier = encrypted ? 'Encrypted' : 'Decrypted';
    const filename = `Standard Notes ${modifier} Backup - ${this._formattedDate()}.txt`;

    if (ApplicationState.isIOS) {
      return this._exportIOS(filename, jsonString);
    } else {
      return this._showAndroidEmailOrSaveOption().then(async (result) => {
        if (result === 'email') {
          return this._exportViaEmailAndroid(data, filename);
        } else {
          let filepath = await this._exportAndroid(filename, jsonString);
          return this._showFileSavePromptAndroid(filepath);
        }
      });
    }
  }

  async _showAndroidEmailOrSaveOption() {
    return AlertManager.get()
      .confirm({
        title: 'Choose Export Method',
        cancelButtonText: 'Email',
        confirmButtonText: 'Save to Disk'
      })
      .then(() => {
        return 'save';
      })
      .catch(() => {
        return 'email';
      });
  }

  async _exportIOS(filename: string, data: string) {
    return new Promise((resolve) => {
      ApplicationState.get().performActionWithoutStateChangeImpact(async () => {
        Share.share({
          title: filename,
          message: data
        })
          .then((result) => {
            resolve(result.action !== Share.dismissedAction);
          })
          .catch(() => {
            resolve(false);
          });
      });
    });
  }

  async _exportAndroid(filename: string, data: string) {
    const filepath = `${RNFS.ExternalDirectoryPath}/${filename}`;
    return RNFS.writeFile(filepath, data).then(() => {
      return filepath;
    });
  }

  async _openFileAndroid(filepath: string) {
    return FileViewer.open(filepath)
      .then(() => {
        // success
        return true;
      })
      .catch((error) => {
        console.log('Error opening file', error);
        return false;
      });
  }

  async _showFileSavePromptAndroid(filepath: string) {
    return AlertManager.get()
      .confirm({
        title: 'Backup Saved',
        text: `Your backup file has been saved to your local disk at this location:\n\n${filepath}`,
        cancelButtonText: 'Done',
        confirmButtonText: 'Open File',
        onConfirm: () => {
          this._openFileAndroid(filepath);
        }
      })
      .then(() => {
        return true;
      })
      .catch(() => {
        // Did Cancel, still success
        return true;
      });
  }

  async _exportViaEmailAndroid(data: { items: any[] }, filename: string) {
    return new Promise((resolve) => {
      const jsonString = JSON.stringify(data, null, 2 /* pretty print */);
      const stringData = base64.encode(
        unescape(encodeURIComponent(jsonString))
      );
      const fileType = '.json'; // Android creates a tmp file and expects dot with extension

      let resolved = false;
      // TODO: fix mail types
      // @ts-ignore
      Mailer.mail(
        {
          subject: 'Standard Notes Backup',
          recipients: [''],
          body: '',
          isHTML: true,
          attachment: { data: stringData, type: fileType, name: filename }
        },
        (error: any) => {
          if (error) {
            Alert.alert('Error', 'Unable to send email.');
          }
          resolved = true;
          resolve();
        }
      );

      // On Android the Mailer callback event isn't always triggered.
      setTimeout(function () {
        if (!resolved) {
          resolve();
        }
      }, 2500);
    });
  }

  /* Utils */

  _formattedDate() {
    return new Date().getTime();
  }
}

import { Share, Alert } from 'react-native';
import Storage from '@SFJS/storageManager'
import Auth from '@SFJS/authManager'
import KeysManager from '@Lib/keysManager'
import AlertManager from "@SFJS/alertManager";
import UserPrefsManager from '@Lib/userPrefsManager'
import ModelManager from '@SFJS/modelManager'
import ApplicationState from "@Lib/ApplicationState"
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';

const Mailer = require('NativeModules').RNMail;
const base64 = require('base-64');

export default class BackupsManager {

  static instance = null;
  static get() {
    if(this.instance == null) {
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

  async export(encrypted) {
    var auth_params = await Auth.get().getAuthParams();
    var keys = encrypted ? KeysManager.get().activeKeys() : null;

    var items = [];

    for(var item of ModelManager.get().allItems) {
      var itemParams = new SFItemParams(item, keys, auth_params);
      var params = await itemParams.paramsForExportFile();
      items.push(params);
    }

    if(items.length == 0) {
      Alert.alert('No Data', "You don't have any notes yet.");
      return false;
    }

    var data = {items: items}

    if(keys) {
      var authParams = KeysManager.get().activeAuthParams();
      // auth params are only needed when encrypted with a standard file key
      data["auth_params"] = authParams;
    }

    var jsonString = JSON.stringify(data, null, 2 /* pretty print */);
    let modifier = encrypted ? "Encrypted" : "Decrypted";
    let filename = `Standard Notes ${modifier} Backup - ${this._formattedDate()}.txt`;

    if(ApplicationState.isIOS) {
      return this._exportIOS(filename, jsonString);
    } else {
      return this._showAndroidEmailOrSaveOption().then(async (result) => {
        if(result == "email") {
          return this._exportViaEmailAndroid(data, filename);
        } else {
          let filepath = await this._exportAndroid(filename, jsonString);
          return this._showFileSavePromptAndroid(filepath);
        }
      })
    }
  }

  async _showAndroidEmailOrSaveOption() {
    return AlertManager.get().confirm({
      title: "Choose Export Method",
      cancelButtonText: "Email",
      confirmButtonText: "Save to Disk"
    }).then(() => {
      return "save";
    }).catch(() => {
      return "email";
    })
  }

  async _exportIOS(filename, data) {
    return new Promise((resolve, reject) => {
      ApplicationState.get().performActionWithoutStateChangeImpact(async () => {
        Share.share({
          title: filename,
          message: data,
        }).then((result) => {
          resolve(result != Share.dismissedAction);
        }).catch((error) => {
          resolve(false);
        })
      })
    })
  }

  async _exportAndroid(filename, data) {
    let filepath = `${RNFS.ExternalDirectoryPath}/${filename}`;
    return RNFS.writeFile(filepath, data).then(() => {
      return filepath;
    })
  }

  async _openFileAndroid(filepath) {
    return FileViewer.open(filepath).then(() => {
      // success
      return true;
    }).catch(error => {
      console.log("Error opening file", error);
      return false;
    });
  }

  async _showFileSavePromptAndroid(filepath) {
    return AlertManager.get().confirm({
      title: "Backup Saved",
      text: `Your backup file has been saved to your local disk at this location:\n\n${filepath}`,
      cancelButtonText: "Done",
      confirmButtonText: "Open File",
      onConfirm: () => {
        this._openFileAndroid(filepath);
      }
    }).then(() => {
      return true;
    }).catch(() => {
      // Did Cancel, still success
      return true;
    })
  }

  async _exportViaEmailAndroid(data, filename) {
    return new Promise((resolve, reject) => {
      var jsonString = JSON.stringify(data, null, 2 /* pretty print */);
      var stringData = base64.encode(unescape(encodeURIComponent(jsonString)));
      var fileType = ".json"; // Android creates a tmp file and expects dot with extension

      var resolved = false;

      Mailer.mail({
        subject: 'Standard Notes Backup',
        recipients: [''],
        body: '',
        isHTML: true,
        attachment: { data: stringData, type: fileType, name: filename }
      }, (error, event) => {
        if(error) {
          Alert.alert('Error', 'Unable to send email.');
        }
        resolved = true;
        resolve();
      });

      // On Android the Mailer callback event isn't always triggered.
      setTimeout(function () {
        if(!resolved) {
          resolve();
        }
      }, 2500);
    })
  }

  /* Utils */

  _formattedDate() {
    return new Date().getTime();
  }
}

import { Alert, Share } from 'react-native';
import FileViewer from 'react-native-file-viewer';
import RNFS from 'react-native-fs';
import { ApplicationService, ButtonType, Platform } from 'snjs';
import { MobileApplication } from './application';

const Mailer = 'react-native-mail';

export class BackupsService extends ApplicationService {
  /*
    On iOS, we can use Share to share a file of arbitrary length.
    This doesn't work on Android however. Seems to have a very low limit.
    For Android, we'll use RNFS to save the file to disk, then FileViewer to
    ask the user what application they would like to open the file with.
    For .txt files, not many applications handle it. So, we'll want to notify the user
    the path the file was saved to.
   */

  async export(encrypted: boolean) {
    const data = await this.application!.createBackupFile(
      undefined,
      undefined,
      true
    );

    const jsonString = JSON.stringify(data, null, 2 /* pretty print */);
    const modifier = encrypted ? 'Encrypted' : 'Decrypted';
    const filename = `Standard Notes ${modifier} Backup - ${this._formattedDate()}.txt`;
    if (data) {
      if (this.application!.platform === Platform.Ios) {
        return this._exportIOS(filename, jsonString);
      } else {
        return this._showAndroidEmailOrSaveOption().then(async result => {
          if (result === 'email') {
            return this._exportViaEmailAndroid(data, filename);
          } else {
            let filepath = await this._exportAndroid(filename, jsonString);
            return this._showFileSavePromptAndroid(filepath);
          }
        });
      }
    }
  }

  async _showAndroidEmailOrSaveOption() {
    const confirmed = await this.application!.alertService?.confirm(
      'Choose Export Method',
      'Email',
      'Save to Disk'
    );
    if (confirmed) {
      return 'save';
    } else {
      return 'email';
    }
  }

  async _exportIOS(filename: string, data: string) {
    return new Promise(resolve => {
      (this.application! as MobileApplication)
        .getAppState()
        .performActionWithoutStateChangeImpact(async () => {
          Share.share({
            title: filename,
            message: data,
          })
            .then(result => {
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
      .catch(error => {
        console.log('Error opening file', error);
        return false;
      });
  }

  async _showFileSavePromptAndroid(filepath: string) {
    const confirmed = await this.application!.alertService?.confirm(
      'Backup Saved',
      `Your backup file has been saved to your local disk at this location:\n\n${filepath}`,
      'Done',
      ButtonType.Info,
      'Open File'
    );
    if (confirmed) {
      this._openFileAndroid(filepath);
    }
    return true;
  }

  async _exportViaEmailAndroid(data: string, filename: string) {
    return new Promise(resolve => {
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
          attachment: { data, type: fileType, name: filename },
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

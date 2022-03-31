import { ApplicationService, SNFile } from '@standardnotes/snjs';
import { Buffer } from 'buffer';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS, {
  CachesDirectoryPath,
  DocumentDirectoryPath,
  DownloadDirectoryPath,
} from 'react-native-fs';

type TGetFileDestinationPath = {
  fileName: string;
  saveInTempLocation?: boolean;
};

export class FilesService extends ApplicationService {
  getDestinationPath({
    fileName,
    saveInTempLocation = false,
  }: TGetFileDestinationPath): string {
    let directory = DocumentDirectoryPath;

    if (Platform.OS === 'android') {
      directory = saveInTempLocation
        ? CachesDirectoryPath
        : DownloadDirectoryPath;
    }
    return `${directory}/${fileName}`;
  }

  async hasStoragePermissionOnAndroid(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }
    const grantedStatus = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );
    if (grantedStatus === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }
    await this.application.alertService.alert(
      'Storage permissions are required in order to download files. Please accept the permissions prompt and try again.'
    );
    return false;
  }

  async downloadFileInChunks(file: SNFile, path: string): Promise<void> {
    await this.application.files.downloadFile(
      file,
      async (decryptedBytes: Uint8Array) => {
        const base64String = new Buffer(decryptedBytes).toString('base64');

        await RNFS.appendFile(path, base64String, 'base64');
      }
    );
  }
}

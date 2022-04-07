import {
  FileSelectionResponse,
  OnChunkCallback,
} from '@standardnotes/filepicker';
import { ByteChunker } from '@standardnotes/filepicker/dist/byte_chunker';
import { ApplicationService, SNFile } from '@standardnotes/snjs';
import { Buffer } from 'buffer';
import { Base64 } from 'js-base64';
import { PermissionsAndroid, Platform } from 'react-native';
import { DocumentPickerResponse } from 'react-native-document-picker';
import RNFS, {
  CachesDirectoryPath,
  DocumentDirectoryPath,
  DownloadDirectoryPath,
  read,
} from 'react-native-fs';

type TGetFileDestinationPath = {
  fileName: string;
  saveInTempLocation?: boolean;
};

export class FilesService extends ApplicationService {
  private fileChunkSizeForReading = 2_000_000;
  private minimumChunkSizeForUploading = 5_000_000;

  getFileChunkSize(): number {
    return this.fileChunkSizeForReading;
  }

  getMinimumChunkSize(): number {
    return this.minimumChunkSizeForUploading;
  }

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

  async readFile(
    file: DocumentPickerResponse,
    onChunk: OnChunkCallback
  ): Promise<FileSelectionResponse> {
    const fileUri = Platform.OS === 'ios' ? decodeURI(file.uri) : file.uri;

    let fileContentsInString = '';
    let positionShift = 0;
    let filePortion = '';

    do {
      filePortion = await read(
        fileUri,
        this.fileChunkSizeForReading,
        positionShift,
        'base64'
      );
      fileContentsInString += filePortion;
      positionShift += this.fileChunkSizeForReading;
    } while (filePortion.length > 0);

    const bytes = Base64.toUint8Array(fileContentsInString);

    const chunker = new ByteChunker(this.minimumChunkSizeForUploading, onChunk);

    for (let i = 0; i < bytes.length; i += this.fileChunkSizeForReading) {
      const chunkMax = i + this.fileChunkSizeForReading;
      const chunk = bytes.slice(i, chunkMax);
      const isFinalChunk = chunkMax >= bytes.length;
      await chunker.addBytes(chunk, isFinalChunk);
    }

    return {
      name: file.name,
      mimeType: file.type || '',
    };
  }
}

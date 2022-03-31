import { SNFile } from '@standardnotes/snjs';

export enum UploadedFileItemActionType {
  AttachFileToNote,
  DetachFileToNote,
  DeleteFile,
  ShareFile,
  DownloadFile,
  RenameFile,
  ToggleFileProtection,
  PreviewFile,
}

export type UploadedFileItemAction =
  | {
      type: Exclude<
        UploadedFileItemActionType,
        | UploadedFileItemActionType.RenameFile
        | UploadedFileItemActionType.ToggleFileProtection
      >;
      payload: SNFile;
    }
  | {
      type: UploadedFileItemActionType.ToggleFileProtection;
      payload: SNFile;
    }
  | {
      type: UploadedFileItemActionType.RenameFile;
      payload: {
        file: SNFile;
        name: string;
      };
    };

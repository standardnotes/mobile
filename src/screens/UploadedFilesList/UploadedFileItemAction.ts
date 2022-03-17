import { SNFile } from '@standardnotes/snjs';

export enum UploadedFileItemActionType {
  AttachFileToNote,
  DetachFileToNote,
  DeleteFile,
  ShareFile,
  DownloadFile,
  RenameFile,
  ToggleFileProtection,
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
      callback: (isProtected: boolean) => void;
    }
  | {
      type: UploadedFileItemActionType.RenameFile;
      payload: {
        file: SNFile;
        name: string;
      };
    };

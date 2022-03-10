import { iconStyles } from '@Components/Icon.styled';
import { IconType } from '@standardnotes/snjs';
import ArchiveIcon from '@standardnotes/stylekit/dist/icons/ic-archive.svg';
import AttachmentFileIcon from '@standardnotes/stylekit/dist/icons/ic-attachment-file.svg';
import AuthenticatorIcon from '@standardnotes/stylekit/dist/icons/ic-authenticator.svg';
import CodeIcon from '@standardnotes/stylekit/dist/icons/ic-code.svg';
import MarkdownIcon from '@standardnotes/stylekit/dist/icons/ic-markdown.svg';
import NotesIcon from '@standardnotes/stylekit/dist/icons/ic-notes.svg';
import OpenInIcon from '@standardnotes/stylekit/dist/icons/ic-open-in.svg';
import PencilOffIcon from '@standardnotes/stylekit/dist/icons/ic-pencil-off.svg';
import PinFilledIcon from '@standardnotes/stylekit/dist/icons/ic-pin-filled.svg';
import SpreadsheetsIcon from '@standardnotes/stylekit/dist/icons/ic-spreadsheets.svg';
import TasksIcon from '@standardnotes/stylekit/dist/icons/ic-tasks.svg';
import PlainTextIcon from '@standardnotes/stylekit/dist/icons/ic-text-paragraph.svg';
import RichTextIcon from '@standardnotes/stylekit/dist/icons/ic-text-rich.svg';
import TrashFilledIcon from '@standardnotes/stylekit/dist/icons/ic-trash-filled.svg';
import UserAddIcon from '@standardnotes/stylekit/dist/icons/ic-user-add.svg';
import FilesIllustration from '@standardnotes/stylekit/dist/icons/il-files.svg';
import FileDocIcon from '@standardnotes/stylekit/dist/icons/ic-file-doc.svg';
import FileImageIcon from '@standardnotes/stylekit/dist/icons/ic-file-image.svg';
import FileMovIcon from '@standardnotes/stylekit/dist/icons/ic-file-mov.svg';
import FileMusicIcon from '@standardnotes/stylekit/dist/icons/ic-file-music.svg';
import FileOtherIcon from '@standardnotes/stylekit/dist/icons/ic-file-other.svg';
import FilePdfIcon from '@standardnotes/stylekit/dist/icons/ic-file-pdf.svg';
import FilePptIcon from '@standardnotes/stylekit/dist/icons/ic-file-ppt.svg';
import FileXlsIcon from '@standardnotes/stylekit/dist/icons/ic-file-xls.svg';
import FileZipIcon from '@standardnotes/stylekit/dist/icons/ic-file-zip.svg';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';

const ICONS = {
  'pencil-off': PencilOffIcon,
  'plain-text': PlainTextIcon,
  'rich-text': RichTextIcon,
  code: CodeIcon,
  markdown: MarkdownIcon,
  spreadsheets: SpreadsheetsIcon,
  tasks: TasksIcon,
  authenticator: AuthenticatorIcon,
  'trash-filled': TrashFilledIcon,
  'pin-filled': PinFilledIcon,
  archive: ArchiveIcon,
  'user-add': UserAddIcon,
  'open-in': OpenInIcon,
  notes: NotesIcon,
  'attachment-file': AttachmentFileIcon,
  'files-illustration': FilesIllustration,
  'file-doc': FileDocIcon,
  'file-image': FileImageIcon,
  'file-mov': FileMovIcon,
  'file-music': FileMusicIcon,
  'file-other': FileOtherIcon,
  'file-pdf': FilePdfIcon,
  'file-ppt': FilePptIcon,
  'file-xls': FileXlsIcon,
  'file-zip': FileZipIcon,
};

export type TEditorIcon = Extract<
  IconType,
  | 'pencil-off'
  | 'plain-text'
  | 'rich-text'
  | 'code'
  | 'markdown'
  | 'spreadsheets'
  | 'tasks'
  | 'authenticator'
  | 'trash-filled'
  | 'pin-filled'
  | 'archive'
>;
export type TGeneralIcon = Extract<
  IconType,
  | 'user-add'
  | 'open-in'
  | 'notes'
  | 'attachment-file'
  | 'files-illustration'
  | 'file-pdf'
  | 'file-doc'
  | 'file-ppt'
  | 'file-xls'
  | 'file-image'
  | 'file-other'
  | 'file-mov'
  | 'file-music'
  | 'file-zip'
>;

type Props = {
  type: TEditorIcon | TGeneralIcon;
  fill?: string;
  styles?: Record<string, unknown>;
  width?: number;
  height?: number;
};

export const SnIcon = ({ type, fill, width, height, styles = {} }: Props) => {
  const theme = useContext(ThemeContext);
  const fillColor = fill || theme.stylekitPalSky;

  const IconComponent = ICONS[type];

  if (!IconComponent) {
    return null;
  }

  let customSizes = {};
  if (width !== undefined) {
    customSizes = {
      ...customSizes,
      width,
    };
  }
  if (height !== undefined) {
    customSizes = {
      ...customSizes,
      height,
    };
  }

  return (
    <IconComponent
      fill={fillColor}
      {...customSizes}
      style={{
        ...iconStyles.icon,
        ...styles,
      }}
    />
  );
};

import { iconStyles } from '@Components/Icon.styled';
import { Color } from '@Root/constants';
import { IconType } from '@standardnotes/snjs/dist/@types/types';
import React from 'react';
import ArchiveIcon from '../style/Images/ic-archive.svg';
import CodeIcon from '../style/Images/ic-code.svg';
import MarkdownIcon from '../style/Images/ic-markdown.svg';
import PencilOffIcon from '../style/Images/ic-pencil-off.svg';
import PinFilledIcon from '../style/Images/ic-pin-filled.svg';
import SpreadsheetsIcon from '../style/Images/ic-spreadsheets.svg';
import TasksIcon from '../style/Images/ic-tasks.svg';
import PlainTextIcon from '../style/Images/ic-text-paragraph.svg';
import RichTextIcon from '../style/Images/ic-text-rich.svg';
import TrashFilledIcon from '../style/Images/ic-trash-filled.svg';

const ICONS = {
  'pencil-off': PencilOffIcon,
  'plain-text': PlainTextIcon,
  'rich-text': RichTextIcon,
  code: CodeIcon,
  markdown: MarkdownIcon,
  spreadsheets: SpreadsheetsIcon,
  tasks: TasksIcon,
  'trash-filled': TrashFilledIcon,
  'pin-filled': PinFilledIcon,
  archive: ArchiveIcon,
};

export type EditorIconType = Extract<
  IconType,
  | 'pencil-off'
  | 'plain-text'
  | 'rich-text'
  | 'code'
  | 'markdown'
  | 'spreadsheets'
  | 'tasks'
  | 'trash-filled'
  | 'pin-filled'
  | 'archive'
>;

type Props = {
  type: EditorIconType;
  fill?: string;
  styles?: Record<string, unknown>;
};

export const Icon = ({ type, fill = Color.PalSky, styles = {} }: Props) => {
  const IconComponent = ICONS[type];

  return (
    <IconComponent
      fill={fill}
      style={{
        ...iconStyles.icon,
        ...styles,
      }}
    />
  );
};

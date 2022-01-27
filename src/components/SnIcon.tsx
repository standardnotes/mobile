import { iconStyles } from '@Components/Icon.styled';
import { IconType } from '@standardnotes/snjs/dist/@types/types';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import ArchiveIcon from '../style/Images/ic-archive.svg';
import AuthenticatorIcon from '../style/Images/ic-authenticator.svg';
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
  authenticator: AuthenticatorIcon,
  'trash-filled': TrashFilledIcon,
  'pin-filled': PinFilledIcon,
  archive: ArchiveIcon,
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

type Props = {
  type: TEditorIcon;
  fill?: string;
  styles?: Record<string, unknown>;
};

export const SnIcon = ({ type, fill, styles = {} }: Props) => {
  const theme = useContext(ThemeContext);
  const fillColor = fill || theme.stylekitPalSky;

  const IconComponent = ICONS[type];

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent
      fill={fillColor}
      style={{
        ...iconStyles.icon,
        ...styles,
      }}
    />
  );
};

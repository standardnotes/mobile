import { iconStyles } from '@Components/Icon.styled';
import { IconType } from '@standardnotes/snjs';
import ArchiveIcon from '@standardnotes/stylekit/dist/icons/ic-archive.svg';
import AuthenticatorIcon from '@standardnotes/stylekit/dist/icons/ic-authenticator.svg';
import CodeIcon from '@standardnotes/stylekit/dist/icons/ic-code.svg';
import MarkdownIcon from '@standardnotes/stylekit/dist/icons/ic-markdown.svg';
import PencilOffIcon from '@standardnotes/stylekit/dist/icons/ic-pencil-off.svg';
import PinFilledIcon from '@standardnotes/stylekit/dist/icons/ic-pin-filled.svg';
import SpreadsheetsIcon from '@standardnotes/stylekit/dist/icons/ic-spreadsheets.svg';
import TasksIcon from '@standardnotes/stylekit/dist/icons/ic-tasks.svg';
import PlainTextIcon from '@standardnotes/stylekit/dist/icons/ic-text-paragraph.svg';
import RichTextIcon from '@standardnotes/stylekit/dist/icons/ic-text-rich.svg';
import TrashFilledIcon from '@standardnotes/stylekit/dist/icons/ic-trash-filled.svg';
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

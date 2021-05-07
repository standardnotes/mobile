import IconArchive from '@Style/Icons/ic-archive.svg';
import IconHistory from '@Style/Icons/ic-history.svg';
import IconListed from '@Style/Icons/ic-listed.svg';
import IconPencifOff from '@Style/Icons/ic-pencil-off.svg';
import IconPin from '@Style/Icons/ic-pin.svg';
import IconProtect from '@Style/Icons/ic-protect.svg';
import IconShare from '@Style/Icons/ic-share.svg';
import IconTrash from '@Style/Icons/ic-trash.svg';
import IconWarning from '@Style/Icons/ic-warning.svg';
import React from 'react';

const Icons = {
  archive: IconArchive,
  history: IconHistory,
  listed: IconListed,
  pencilOff: IconPencifOff,
  pin: IconPin,
  protect: IconProtect,
  share: IconShare,
  trash: IconTrash,
  warning: IconWarning,
};

export type IconType = keyof typeof Icons;

type Props = {
  type: IconType;
  size: number;
  color: string;
};

export const Icon: React.FC<Props> = ({ type, size, color }) => {
  const IconComponent = Icons[type];
  return <IconComponent width={size} height={size} fill={color} />;
};

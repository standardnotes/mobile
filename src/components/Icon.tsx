import IconArchive from '@Style/Icons/ic-archive.svg';
import IconHistory from '@Style/Icons/ic-history.svg';
import IconListed from '@Style/Icons/ic-listed.svg';
import IconLock from '@Style/Icons/ic-lock.svg';
import IconPin from '@Style/Icons/ic-pin.svg';
import IconProtect from '@Style/Icons/ic-protect.svg';
import IconShare from '@Style/Icons/ic-share.svg';
import IconTrash from '@Style/Icons/ic-trash.svg';
import React from 'react';

export enum IconType {
  Archive = 'ic-archive',
  History = 'ic-history',
  Listed = 'ic-listed',
  Lock = 'ic-lock',
  Pin = 'ic-pin',
  Protect = 'ic-protect',
  Share = 'ic-share',
  Trash = 'ic-trash',
}

const Icons = {
  [IconType.Archive]: IconArchive,
  [IconType.History]: IconHistory,
  [IconType.Listed]: IconListed,
  [IconType.Lock]: IconLock,
  [IconType.Pin]: IconPin,
  [IconType.Protect]: IconProtect,
  [IconType.Share]: IconShare,
  [IconType.Trash]: IconTrash,
};

type Props = {
  type: IconType;
  size: number;
  color: string;
};

export const Icon: React.FC<Props> = ({ type, size, color }) => {
  const IconComponent = Icons[type];
  return <IconComponent width={size} height={size} fill={color} />;
};

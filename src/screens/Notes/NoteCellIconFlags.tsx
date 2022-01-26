import { EditorIconType, Icon } from '@Components/Icon';
import { SNNote } from '@standardnotes/snjs';
import React from 'react';
import styled from 'styled-components/native';

const FlagIconsContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
`;
type Props = {
  note: SNNote;
};

export const NoteCellIconFlags = ({ note }: Props) => {
  const flagIcons = [] as EditorIconType[];

  if (note.archived) {
    flagIcons.push('archive');
  }
  if (note.locked) {
    flagIcons.push('pencil-off');
  }
  if (note.trashed) {
    flagIcons.push('trash-filled');
  }
  if (note.pinned) {
    flagIcons.push('pin-filled');
  }
  return flagIcons.length ? (
    <FlagIconsContainer>
      {flagIcons.map((icon, index) => (
        <Icon key={index} type={icon} />
      ))}
    </FlagIconsContainer>
  ) : null;
};

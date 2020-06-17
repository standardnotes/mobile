import React, { useContext } from 'react';
import styled, { ThemeContext } from 'styled-components/native';
import { SNNote } from 'snjs';

const FlagsContainer = styled.View`
  flex: 1;
  flex-direction: 'row';
  margin-bottom: 8;
`;
const FlagContainer = styled.View<{ color: string; selected: boolean }>`
  background-color: ${({ theme, selected, color }) =>
    selected ? theme.stylekitInfoContrastColor : color};
  padding: 4;
  padding-left: 6;
  padding-right: 6;
  border-radius: 3;
  margin-right: 4;
`;
const FlagLabel = styled.Text<{ selected: boolean }>`
  color: ${({ theme, selected }) =>
    selected ? theme.stylekitInfoColor : theme.stylekitInfoContrastColor};
  font-size: 10;
  font-weight: bold;
`;

export const NoteCellFlags = ({
  note,
  highlight,
}: {
  note: SNNote;
  highlight: boolean;
}): JSX.Element => {
  const theme = useContext(ThemeContext);

  let flags = [];

  if (note.pinned) {
    flags.push({
      text: 'Pinned',
      color: theme.stylekitInfoColor,
    });
  }

  if (note.archived) {
    flags.push({
      text: 'Archived',
      color: theme.stylekitWarningColor,
    });
  }

  if (note.protected) {
    flags.push({
      text: 'Protected',
      color: theme.stylekitSuccessColor,
    });
  }

  if (note.locked) {
    flags.push({
      text: 'Locked',
      color: theme.stylekitNeutralColor,
    });
  }

  if (note.trashed) {
    flags.push({
      text: 'Deleted',
      color: theme.stylekitDangerColor,
    });
  }

  if (note.errorDecrypting) {
    flags.push({
      text: 'Missing Keys',
      color: theme.stylekitDangerColor,
    });
  }

  if (note.conflictOf) {
    flags.push({
      text: 'Conflicted Copy',
      color: theme.stylekitDangerColor,
    });
  }

  if (note.deleted) {
    flags.push({
      text: 'Deletion Pending Sync',
      color: theme.stylekitDangerColor,
    });
  }

  return flags.length > 0 ? (
    <FlagsContainer>
      {flags.map(flag => (
        <FlagContainer color={flag.color} selected={highlight}>
          <FlagLabel selected={highlight}>{flag.text}</FlagLabel>
        </FlagContainer>
      ))}
    </FlagsContainer>
  ) : (
    <></>
  );
};

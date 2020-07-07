import React, { useContext } from 'react';
import { SNNote } from 'snjs';
import styled, { ThemeContext } from 'styled-components/native';

const FlagsContainer = styled.View`
  flex: 1;
  flex-direction: row;
  margin-bottom: 8px;
`;
const FlagContainer = styled.View<{ color: string; selected: boolean }>`
  background-color: ${({ theme, selected, color }) =>
    selected ? theme.stylekitInfoContrastColor : color};
  padding: 4px;
  padding-left: 6px;
  padding-right: 6px;
  border-radius: 3px;
  margin-right: 4px;
`;
const FlagLabel = styled.Text<{ selected: boolean }>`
  color: ${({ theme, selected }) =>
    selected ? theme.stylekitInfoColor : theme.stylekitInfoContrastColor};
  font-size: 10px;
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
        <FlagContainer
          key={flag.text.concat(flag.color)}
          color={flag.color}
          selected={highlight}
        >
          <FlagLabel selected={highlight}>{flag.text}</FlagLabel>
        </FlagContainer>
      ))}
    </FlagsContainer>
  ) : (
    <></>
  );
};

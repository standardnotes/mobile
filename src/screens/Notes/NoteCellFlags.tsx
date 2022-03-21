import { SNNote } from '@standardnotes/snjs';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import styled from 'styled-components/native';

type NoteFlag = {
  text: string;
  color: string;
};

const FlagsContainer = styled.View`
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
}) => {
  const theme = useContext(ThemeContext);

  let flags: NoteFlag[] = [];

  if (note.errorDecrypting) {
    if (note.waitingForKey) {
      flags.push({
        text: 'Waiting For Keys',
        color: theme.stylekitWarningColor,
      });
    } else {
      flags.push({
        text: 'Missing Keys',
        color: theme.stylekitDangerColor,
      });
    }
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

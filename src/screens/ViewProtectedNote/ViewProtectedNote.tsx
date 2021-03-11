import { Button } from '@Components/Button';
import { AppStackNavigationProp } from '@Root/AppStack';
import { SCREEN_VIEW_PROTECTED_NOTE } from '@Screens/screens';
import React from 'react';
import { Container, Text, Title } from './ViewProtectedNote.styled';

type Props = AppStackNavigationProp<typeof SCREEN_VIEW_PROTECTED_NOTE>;

export const ViewProtectedNote = ({
  route: {
    params: { onPressView },
  },
}: Props) => {
  return (
    <Container>
      <Title>This note is Protected.</Title>
      <Button label="View" onPress={onPressView} />
      <Text>
        Add a passcode, account or biometrics to require authentication to view
        this note.
      </Text>
    </Container>
  );
};

import React, { useContext, useMemo } from 'react';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ContentType } from 'snjs';
import {
  Cell,
  Touchable,
  Title,
  SubTitle,
  OutOfSyncContainer,
  IconCircle,
  OutOfSyncLabel,
} from './SideMenuHero.styled';
import { ViewProps } from 'react-native';
import { Circle } from '@Components/Circle';
import { ThemeContext } from 'styled-components/native';
import { useSignedIn, useOutOfSync } from '@Lib/customHooks';

type Props = {
  onPress: () => void;
  onOutOfSyncPress: () => void;
  testID: ViewProps['testID'];
};

export const SideMenuHero: React.FC<Props> = props => {
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  const signedIn = useSignedIn();
  const isOutOfSync = useOutOfSync();
  const textData = useMemo(() => {
    const hasEncryption = !signedIn; // TODO: check this
    if (!signedIn) {
      return {
        title: 'Data Not Backed Up',
        text: hasEncryption
          ? 'Sign in or register to enable sync to your other devices.'
          : 'Sign in or register to add encryption and enable sync to your other devices.',
      };
    } else {
      const user = application?.getUser();
      const email = user?.email;
      const items = application!.getItems([ContentType.Note, ContentType.Tag]);
      const itemsStatus =
        items.length + '/' + items.length + ' notes and tags encrypted';
      return {
        title: email,
        text: itemsStatus,
      };
    }
  }, [signedIn]);

  return (
    <Cell>
      <Touchable testID={props.testID} onPress={props.onPress}>
        <Title>{textData.title}</Title>
      </Touchable>
      <Touchable onPress={props.onPress}>
        <SubTitle>{textData.text}</SubTitle>
      </Touchable>
      {isOutOfSync && (
        <OutOfSyncContainer onPress={props.onOutOfSyncPress}>
          <IconCircle>
            <Circle
              size={10}
              backgroundColor={theme.stylekitWarningColor}
              borderColor={theme.stylekitWarningColor}
            />
          </IconCircle>
          <OutOfSyncLabel>Potentially Out of Sync</OutOfSyncLabel>
        </OutOfSyncContainer>
      )}
    </Cell>
  );
};

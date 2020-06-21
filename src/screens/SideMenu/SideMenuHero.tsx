import React, { useContext, useCallback } from 'react';
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

type Props = {
  onPress: () => void;
  outOfSync: boolean;
  onOutOfSyncPress: () => void;
  testID: ViewProps['testID'];
};

export const SideMenuHero: React.FC<Props> = props => {
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  const getText = useCallback(() => {
    const noAccount = application?.noAccount();
    const hasEncryption = !noAccount; // TODO: check this
    if (noAccount) {
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
  }, []);
  const textData = getText();
  return (
    <Cell>
      <Touchable testID={props.testID} onPress={props.onPress}>
        <Title>{textData.title}</Title>
      </Touchable>
      <Touchable onPress={props.onPress}>
        <SubTitle>{textData.text}</SubTitle>
      </Touchable>
      {props.outOfSync && (
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

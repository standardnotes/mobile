import { useNavigation } from '@react-navigation/native';
import { SCREEN_SETTINGS } from '@Root/screens2/screens';
import { ICON_FORWARD, ICON_USER } from '@Style/icons';
import { StyleKit } from '@Style/StyleKit';
import React from 'react';
import {
  BoldText,
  CenterContainer,
  Container,
  ForwardIcon,
  SubText,
  TextContainer,
  Touchable,
  UserIcon,
} from './OfflineBanner.styled';

const NOT_BACKED_UP_TEXT = 'Data not backed up';
const SIGN_IN_TEXT = 'Sign in or register to backup your notes';

export const OfflineBanner: React.FC = () => {
  const navigation = useNavigation();
  const onPress = () => {
    navigation.navigate(SCREEN_SETTINGS);
  };

  return (
    <Touchable onPress={onPress}>
      <Container>
        <CenterContainer>
          <UserIcon name={StyleKit.nameForIcon(ICON_USER)} />
        </CenterContainer>
        <TextContainer>
          <BoldText>{NOT_BACKED_UP_TEXT}</BoldText>
          <SubText>{SIGN_IN_TEXT}</SubText>
        </TextContainer>
        <CenterContainer>
          <ForwardIcon name={StyleKit.nameForIcon(ICON_FORWARD)} />
        </CenterContainer>
      </Container>
    </Touchable>
  );
};

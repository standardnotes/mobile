import React, { useContext, useMemo, useEffect, useState } from 'react';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ContentType, StorageEncryptionPolicies } from 'snjs';
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
  // Context
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);

  // State
  const signedIn = useSignedIn();
  const isOutOfSync = useOutOfSync();
  const [itemsLength, setItemsLength] = useState(0);

  useEffect(() => {
    const removeStreamItems = application!.streamItems(
      [ContentType.Note, ContentType.Tag],
      items => {
        setItemsLength(items.length);
      }
    );

    return removeStreamItems;
  });

  const textData = useMemo(() => {
    const hasEncryption =
      application?.getStorageEncryptionPolicy() ===
      StorageEncryptionPolicies.Default; // TODO: check this
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
      const itemsStatus =
        itemsLength + '/' + itemsLength + ' notes and tags encrypted';
      return {
        title: email,
        text: itemsStatus,
      };
    }
  }, [
    application?.getStorageEncryptionPolicy,
    application?.getUser,
    signedIn,
    itemsLength,
  ]);

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

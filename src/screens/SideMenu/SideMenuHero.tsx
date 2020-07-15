import { Circle } from '@Components/Circle';
import { useOutOfSync, useSignedIn } from '@Lib/customHooks';
import { ApplicationContext } from '@Root/ApplicationContext';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ViewProps } from 'react-native';
import { ApplicationEvent, ContentType, StorageEncryptionPolicies } from 'snjs';
import { ThemeContext } from 'styled-components/native';
import {
  Cell,
  IconCircle,
  OutOfSyncContainer,
  OutOfSyncLabel,
  SubTitle,
  Title,
  Touchable,
} from './SideMenuHero.styled';

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
  const [isLocked, setIsLocked] = React.useState<boolean>(true);
  const isOutOfSync = useOutOfSync();
  const [itemsLength, setItemsLength] = useState(0);

  useEffect(() => {
    const removeStreamItems = application?.streamItems(
      [ContentType.Note, ContentType.Tag],
      items => {
        if (items.length !== itemsLength) {
          setItemsLength(items.length);
        }
      }
    );

    return removeStreamItems;
  }, [application, itemsLength]);

  useEffect(() => {
    const getIsLocked = async () => {
      const locked = await application?.isLocked();
      if (locked === undefined) {
        setIsLocked(true);
      } else {
        setIsLocked(Boolean(locked));
      }
    };

    const removeSignedInObserver = application?.addEventObserver(
      async event => {
        if (
          event === ApplicationEvent.Launched ||
          event === ApplicationEvent.SignedIn ||
          event === ApplicationEvent.SignedOut
        ) {
          getIsLocked();
        }
      }
    );

    return removeSignedInObserver;
  }, [application]);

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
    } else if (!isLocked) {
      const user = application?.getUser();
      const email = user?.email;
      const itemsStatus =
        itemsLength + '/' + itemsLength + ' notes and tags encrypted';
      return {
        title: email,
        text: itemsStatus,
      };
    } else {
      return { text: '', title: '' };
    }
  }, [application, signedIn, itemsLength, isLocked]);

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

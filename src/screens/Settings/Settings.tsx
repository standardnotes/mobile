import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Container } from './Settings.styled';
import { AuthSection } from './Sections/AuthSection';
import { CompanySection } from './Sections/CompanySection';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ModalStackNavigationProp } from '@Root/App';
import { SCREEN_SETTINGS } from '@Root/screens2/screens';
import { useSignedIn } from '@Lib/customHooks';
import { PasscodeSection } from './Sections/PasscodeSection';

type Props = ModalStackNavigationProp<typeof SCREEN_SETTINGS>;
export const Settings = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext);

  // State

  const goBack = useCallback(() => {
    props.navigation.goBack();
  }, [props.navigation]);

  const signedIn = useSignedIn(goBack);

  return (
    <Container
      keyboardShouldPersistTaps={'always'}
      keyboardDismissMode={'interactive'}
    >
      <AuthSection title="Account" signedIn={signedIn} />
      <PasscodeSection title="Security" />
      <CompanySection title="Standard Notes" />
    </Container>
  );
};

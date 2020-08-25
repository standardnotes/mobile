import { useSignedIn } from '@Lib/snjsHooks';
import { ModalStackNavigationProp } from '@Root/App';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_SETTINGS } from '@Screens/screens';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ApplicationEvent } from 'snjs';
import { AuthSection } from './Sections/AuthSection';
import { CompanySection } from './Sections/CompanySection';
import { EncryptionSection } from './Sections/EncryptionSection';
import { OptionsSection } from './Sections/OptionsSection';
import { PasscodeSection } from './Sections/PasscodeSection';
import { PreferencesSection } from './Sections/PreferencesSection';
import { Container } from './Settings.styled';

type Props = ModalStackNavigationProp<typeof SCREEN_SETTINGS>;
export const Settings = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [hasPasscode, setHasPasscode] = useState(() =>
    Boolean(application?.hasPasscode())
  );
  const [encryptionAvailable, setEncryptionAvailable] = useState(() =>
    application?.isEncryptionAvailable()
  );

  useEffect(() => {
    const removeApplicationEventSubscriber = application?.addEventObserver(
      async event => {
        if (event === ApplicationEvent.KeyStatusChanged) {
          setHasPasscode(Boolean(application?.hasPasscode()));
          setEncryptionAvailable(() => application?.isEncryptionAvailable());
        }
      }
    );
    return () => {
      removeApplicationEventSubscriber && removeApplicationEventSubscriber();
    };
  }, [application]);

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
      <OptionsSection
        encryptionAvailable={!!encryptionAvailable}
        title="Options"
      />
      <PreferencesSection />
      <PasscodeSection
        encryptionAvailable={!!encryptionAvailable}
        hasPasscode={hasPasscode}
        title="Security"
      />
      <EncryptionSection
        encryptionAvailable={!!encryptionAvailable}
        title={'Encryption Status'}
      />
      <CompanySection title="Standard Notes" />
    </Container>
  );
};

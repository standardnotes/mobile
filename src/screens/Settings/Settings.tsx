import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Container } from './Settings.styled';
import { AuthSection } from './Sections/AuthSection';
import { CompanySection } from './Sections/CompanySection';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ModalStackNavigationProp } from '@Root/App';
import { SCREEN_SETTINGS } from '@Root/screens2/screens';
import { useSignedIn } from '@Lib/customHooks';
import { PasscodeSection } from './Sections/PasscodeSection';
import { EncryptionSection } from './Sections/EncryptionSection';
import { ApplicationEvent } from 'snjs';

type Props = ModalStackNavigationProp<typeof SCREEN_SETTINGS>;
export const Settings = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [hasPasscode, setHasPasscode] = useState(() =>
    Boolean(application?.hasPasscode())
  );
  const [encryptionAvailable, setEncryptionAvailable] = useState(false);

  useEffect(() => {
    const getEncryptionAvailable = async () => {
      setEncryptionAvailable(
        Boolean(await application?.isEncryptionAvailable())
      );
    };
    getEncryptionAvailable();
    const removeApplicationEventSubscriber = application?.addEventObserver(
      async event => {
        if (event === ApplicationEvent.KeyStatusChanged) {
          setHasPasscode(Boolean(application?.hasPasscode()));
          setEncryptionAvailable(
            Boolean(await application?.isEncryptionAvailable())
          );
        }
      }
    );
    return removeApplicationEventSubscriber;
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
      <PasscodeSection
        encryptionAvailable={encryptionAvailable}
        hasPasscode={hasPasscode}
        title="Security"
      />
      <EncryptionSection
        encryptionAvailable={encryptionAvailable}
        title={'Encryption Status'}
      />
      <CompanySection title="Standard Notes" />
    </Container>
  );
};

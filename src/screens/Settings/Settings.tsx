import { useSignedIn } from '@Lib/customHooks';
import { useFocusEffect } from '@react-navigation/native';
import { ModalStackNavigationProp } from '@Root/App';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_SETTINGS } from '@Root/screens2/screens';
import React, { useCallback, useContext, useState } from 'react';
import { ApplicationEvent } from 'snjs';
import { AuthSection } from './Sections/AuthSection';
import { CompanySection } from './Sections/CompanySection';
import { EncryptionSection } from './Sections/EncryptionSection';
import { PasscodeSection } from './Sections/PasscodeSection';
import { Container } from './Settings.styled';

type Props = ModalStackNavigationProp<typeof SCREEN_SETTINGS>;
export const Settings = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [hasPasscode, setHasPasscode] = useState(() =>
    Boolean(application?.hasPasscode())
  );
  const [encryptionAvailable, setEncryptionAvailable] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const getEncryptionAvailable = async () => {
        const isEncryptionAvailable = await application?.isEncryptionAvailable();
        if (isMounted) {
          setEncryptionAvailable(Boolean(isEncryptionAvailable));
        }
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
      return () => {
        isMounted = false;
        removeApplicationEventSubscriber && removeApplicationEventSubscriber();
      };
    }, [
      application?.addEventObserver,
      application?.hasPasscode,
      application?.isEncryptionAvailable,
    ])
  );

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

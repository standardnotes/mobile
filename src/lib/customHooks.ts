import React from 'react';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ApplicationEvent, ApplicationService } from 'snjs';

export const useSignedIn = (
  signedInCallback?: () => void,
  signedOutCallback?: () => void
) => {
  // Context
  const application = React.useContext(ApplicationContext);

  // State
  const [signedIn, setSignedIn] = React.useState(() =>
    Boolean(!application?.noAccount())
  );

  React.useEffect(() => {
    const removeSignedInObserver = application?.addEventObserver(
      async event => {
        if (event === ApplicationEvent.SignedIn) {
          setSignedIn(true);
          signedInCallback && signedInCallback();
        } else if (event === ApplicationEvent.SignedOut) {
          setSignedIn(false);
          signedOutCallback && signedOutCallback();
        }
      }
    );

    return removeSignedInObserver;
  }, [application, signedInCallback, signedOutCallback]);

  return signedIn;
};

export const useOutOfSync = () => {
  // Context
  const application = React.useContext(ApplicationContext);

  // State
  const [outOfSync, setOutOfSync] = React.useState<boolean>(false);

  React.useEffect(() => {
    const getOutOfSync = async () => {
      const outOfSyncInitial = await application?.isOutOfSync();
      setOutOfSync(Boolean(outOfSyncInitial));
    };
    getOutOfSync();
  }, [application]);

  React.useEffect(() => {
    const removeSignedInObserver = application?.addEventObserver(
      async event => {
        if (event === ApplicationEvent.EnteredOutOfSync) {
          setOutOfSync(true);
        } else if (event === ApplicationEvent.ExitedOutOfSync) {
          setOutOfSync(false);
        }
      }
    );

    return removeSignedInObserver;
  }, [application]);

  return outOfSync;
};

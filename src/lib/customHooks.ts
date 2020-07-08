import { useFocusEffect } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import React, { useCallback } from 'react';
import { ApplicationEvent } from 'snjs';

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
    let isMounted = true;
    const getOutOfSync = async () => {
      const outOfSyncInitial = await application?.isOutOfSync();
      if (isMounted) {
        setOutOfSync(Boolean(outOfSyncInitial));
      }
    };
    getOutOfSync();
    return () => {
      isMounted = false;
    };
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

export const useIsLocked = () => {
  // Context
  const application = React.useContext(ApplicationContext);

  // State
  const [isLocked, setIsLocked] = React.useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      const getIsLocked = async () => {
        const locked = await application?.isLocked();
        setIsLocked(Boolean(locked));
      };
      getIsLocked();
    }, [application])
  );

  return isLocked;
};

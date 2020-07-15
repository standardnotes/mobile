import { ApplicationContext } from '@Root/ApplicationContext';
import React, { useEffect } from 'react';
import { ApplicationEvent } from 'snjs';

export const useSignedIn = (
  signedInCallback?: () => void,
  signedOutCallback?: () => void
) => {
  // Context
  const application = React.useContext(ApplicationContext);

  const isLocked = useIsLocked();

  // State
  const [signedIn, setSignedIn] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const getSignedIn = async () => {
      if (mounted && !isLocked) {
        setSignedIn(!application?.noAccount());
      }
    };
    getSignedIn();
    const removeSignedInObserver = application?.addEventObserver(
      async event => {
        if (event === ApplicationEvent.Launched) {
          getSignedIn();
        }
        if (event === ApplicationEvent.SignedIn) {
          setSignedIn(true);
          signedInCallback && signedInCallback();
        } else if (event === ApplicationEvent.SignedOut) {
          setSignedIn(false);
          signedOutCallback && signedOutCallback();
        }
      }
    );

    return () => {
      mounted = false;
      removeSignedInObserver && removeSignedInObserver();
    };
  }, [application, signedInCallback, signedOutCallback, isLocked]);

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

  useEffect(() => {
    const getIsLocked = async () => {
      const locked = await application?.isLocked();
      if (locked === undefined) {
        setIsLocked(true);
      } else {
        setIsLocked(Boolean(locked));
      }
    };
    getIsLocked();
    const removeSignedInObserver = application?.addEventObserver(
      async event => {
        if (event === ApplicationEvent.Launched) {
          setIsLocked(false);
        }
      }
    );

    return removeSignedInObserver;
  }, [application]);

  return isLocked;
};

export const useHasEditor = () => {
  // Context
  const application = React.useContext(ApplicationContext);

  // State
  const [hasEditor, setHasEditor] = React.useState<boolean>(false);

  useEffect(() => {
    const removeEditorObserver = application?.editorGroup.addChangeObserver(
      newEditor => {
        setHasEditor(Boolean(newEditor));
      }
    );
    return removeEditorObserver;
  });

  return hasEditor;
};

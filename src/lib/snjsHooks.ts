import { useNavigation } from '@react-navigation/native';
import { AppStackNavigationProp } from '@Root/App';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_NOTES } from '@Screens/screens';
import React, { useCallback, useEffect } from 'react';
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
    let isMounted = true;
    const getIsLocked = async () => {
      const locked = await application?.isLocked();
      if (isMounted) {
        if (locked === undefined) {
          setIsLocked(true);
        } else {
          setIsLocked(Boolean(locked));
        }
      }
    };
    getIsLocked();
    const removeSignedInObserver = application?.addEventObserver(
      async event => {
        if (event === ApplicationEvent.Launched) {
          if (isMounted) {
            setIsLocked(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      removeSignedInObserver && removeSignedInObserver();
    };
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

export const useSyncStatus = () => {
  // Context
  const application = React.useContext(ApplicationContext);
  const navigation = useNavigation<
    AppStackNavigationProp<typeof SCREEN_NOTES>['navigation']
  >();

  // State
  const [completedInitialSync, setCompletedInitialSync] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [decrypting, setDecrypting] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const setStatus = useCallback(
    (status?: string, color?: string) => {
      navigation.setParams({
        subTitle: status,
        subTitleColor: color,
      });
    },
    [navigation]
  );

  useEffect(() => {
    let mounted = true;
    const setInitialValues = async () => {
      const isEncryptionAvailable = await application!.isEncryptionAvailable();
      if (mounted) {
        setDecrypting(!completedInitialSync && isEncryptionAvailable);
        setLoading(!completedInitialSync && !isEncryptionAvailable);
      }
    };
    setInitialValues();
    return () => {
      mounted = false;
    };
  }, [application, completedInitialSync]);

  const updateLocalDataStatus = useCallback(() => {
    const syncStatus = application!.getSyncStatus();
    const stats = syncStatus.getStats();
    const encryption = application!.isEncryptionAvailable();
    if (stats.localDataDone) {
      setStatus();
    }
    const notesString = `${stats.localDataCurrent}/${stats.localDataTotal} items...`;
    const loadingStatus = encryption
      ? `Decrypting ${notesString}`
      : `Loading ${notesString}`;
    setStatus(loadingStatus);
  }, [application, setStatus]);

  const updateSyncStatus = useCallback(() => {
    const syncStatus = application!.getSyncStatus();
    const stats = syncStatus.getStats();
    if (syncStatus.hasError()) {
      setStatus('Unable to Sync');
    } else if (stats.downloadCount > 20) {
      const text = `Downloading ${stats.downloadCount} items. Keep app open.`;
      setStatus(text);
    } else if (stats.uploadTotalCount > 20) {
      setStatus(
        `Syncing ${stats.uploadCompletionCount}/${stats.uploadTotalCount} items...`
      );
    } else {
      setStatus();
    }
  }, [application, setStatus]);

  useEffect(() => {
    const unsubscribeAppEvents = application?.addEventObserver(
      async eventName => {
        if (eventName === ApplicationEvent.LocalDataIncrementalLoad) {
          updateLocalDataStatus();
        } else if (
          eventName === ApplicationEvent.SyncStatusChanged ||
          eventName === ApplicationEvent.FailedSync
        ) {
          updateSyncStatus();
        } else if (eventName === ApplicationEvent.LocalDataLoaded) {
          setDecrypting(false);
          setLoading(false);
          updateLocalDataStatus();
        } else if (eventName === ApplicationEvent.WillSync) {
          setStatus('Syncing...');
        } else if (eventName === ApplicationEvent.CompletedFullSync) {
          setStatus();
          if (!completedInitialSync) {
            setCompletedInitialSync(true);
            setLoading(false);
          } else {
            setRefreshing(false);
          }
        } else if (eventName === ApplicationEvent.LocalDatabaseReadError) {
          application!.alertService!.alert(
            'Unable to load local storage. Please restart the app and try again.'
          );
        } else if (eventName === ApplicationEvent.LocalDatabaseWriteError) {
          application!.alertService!.alert(
            'Unable to write to local storage. Please restart the app and try again.'
          );
        }
      }
    );

    return unsubscribeAppEvents;
  }, [
    application,
    completedInitialSync,
    setStatus,
    updateLocalDataStatus,
    updateSyncStatus,
  ]);

  const startRefreshing = () => {
    setRefreshing(true);
  };

  return [loading, decrypting, refreshing, startRefreshing] as [
    boolean,
    boolean,
    boolean,
    () => void
  ];
};

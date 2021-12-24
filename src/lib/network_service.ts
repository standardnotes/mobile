import NetInfo, { NetInfoConfiguration } from '@react-native-community/netinfo';
import { removeFromArray } from '@standardnotes/snjs';
import React, { useEffect, useState } from 'react';

export const useIsOffline = () => {
  const networkService = React.useContext(NetworkServiceContext);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const removeOfflineObserver = networkService!.addNetworkChangeObserver(
      networkState =>
        setIsOffline(
          !networkState.isConnected || !networkState.isInternetReachable
        )
    );

    return () => {
      removeOfflineObserver && removeOfflineObserver();
    };
  }, [networkService]);

  return [isOffline];
};

export const NetworkServiceContext = React.createContext<
  NetworkService | undefined
>(undefined);

type NetworkState = {
  /**
   * If there is an active network connection. If unknown defaults to null.
   */
  isConnected: boolean | null;
  /**
   * If the internet is reachable with the currently active network connection.
   * If unknown defaults to null.
   */
  isInternetReachable: boolean | null;
};

type NetworkChangeObserver = (
  networkState: NetworkState
) => Promise<void> | void;

export class NetworkService {
  private observers: NetworkChangeObserver[] = [];
  private removeNetworkChangeListener?: () => void;

  constructor() {
    const configuration = {
      reachabilityUrl: 'https://api.standardnotes.com/healthcheck',
    } as NetInfoConfiguration;

    NetInfo.configure(configuration);
  }

  deinit() {
    if (this.removeNetworkChangeListener) {
      this.removeNetworkChangeListener();
      this.removeNetworkChangeListener = undefined;
    }
    this.observers.length = 0;
  }

  async registerObservers() {
    this.removeNetworkChangeListener = NetInfo.addEventListener(
      ({ isConnected, isInternetReachable }) => {
        this.notifyObserversOfNetworkChange({
          isConnected,
          isInternetReachable,
        });
      }
    );
  }

  /**
   * Registers an observer for network change
   * @returns function that unregisters this observer
   */
  public addNetworkChangeObserver(callback: NetworkChangeObserver) {
    // Sets initial values.
    NetInfo.fetch().then(({ isConnected, isInternetReachable }) => {
      callback({
        isConnected,
        isInternetReachable,
      });
    });

    // Execute callback on subsequent network state changes.
    this.observers.push(callback);

    return () => {
      removeFromArray(this.observers, callback);
    };
  }

  private notifyObserversOfNetworkChange(networkState: NetworkState) {
    for (const observer of this.observers) {
      observer(networkState);
    }
  }
}

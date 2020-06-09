import React from 'react';
import { MobileApplication } from '@Lib/application';
import { ApplicationGroup } from '@Lib/applicationGroup';

export const CurrentApplication = new ApplicationGroup().application;

export const ApplicationContext = React.createContext<
  MobileApplication | undefined
>(CurrentApplication);

export const ContextProvider: React.FC<{}> = props => (
  <ApplicationContext.Provider value={CurrentApplication}>
    {props.children}
  </ApplicationContext.Provider>
);

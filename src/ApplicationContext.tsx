import React from 'react';
import { MobileApplication } from '@Lib/application';

export const ApplicationContext = React.createContext<
  MobileApplication | undefined
>(undefined);

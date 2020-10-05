import { NavigationContainerRef, StackActions } from '@react-navigation/native';
import * as React from 'react';

export const navigationRef = React.createRef<NavigationContainerRef>();

export function navigate(name: string, params?: any) {
  navigationRef.current?.navigate(name, params);
}

export function push(name: string, params?: any) {
  const pushAction = StackActions.push(name, params);

  navigationRef.current?.dispatch(pushAction);
}

export function goBack() {
  navigationRef.current?.goBack();
}

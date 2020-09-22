import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { MobileApplication } from '@Lib/application';
import { ApplicationGroup } from '@Lib/applicationGroup';
import { navigationRef } from '@Lib/NavigationService';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StyleKit, StyleKitContext } from '@Style/StyleKit';
import { StyleKitTheme } from '@Style/Themes/styled-components';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { ApplicationContext } from './ApplicationContext';
import { MainStackComponent } from './ModalStack';

export type HeaderTitleParams = {
  title?: string;
  subTitle?: string;
  subTitleColor?: string;
};

const AppComponent: React.FC<{
  application: MobileApplication;
  env: 'prod' | 'dev';
}> = ({ application, env }) => {
  const styleKit = useRef<StyleKit>();
  const [activeTheme, setActiveTheme] = useState<StyleKitTheme | undefined>();

  const setStyleKitRef = useCallback((node: StyleKit | undefined) => {
    if (node) {
      node.addThemeChangeObserver(() => {
        setActiveTheme(node.theme);
      });
    }

    // Save a reference to the node
    styleKit.current = node;
  }, []);

  useEffect(() => {
    let styleKitInstance: StyleKit;
    const loadApplication = async () => {
      styleKitInstance = new StyleKit(application);

      setStyleKitRef(styleKitInstance);
      setActiveTheme(styleKitInstance.theme);
      await application?.prepareForLaunch({
        receiveChallenge: async challenge => {
          application!.promptForChallenge(challenge);
        },
      });
      await styleKitInstance.init();
      await application?.launch();
    };

    loadApplication();

    return () => {
      styleKitInstance?.deinit();
      setStyleKitRef(undefined);
    };
  }, [application, application.Uuid, env, setStyleKitRef]);

  if (!styleKit.current || !activeTheme) {
    return null;
  }

  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: activeTheme.stylekitBackgroundColor,
          border: activeTheme.stylekitBorderColor,
        },
      }}
      ref={navigationRef}
    >
      <StatusBar translucent />
      {styleKit.current && (
        <>
          <ThemeProvider theme={activeTheme}>
            <ActionSheetProvider>
              <StyleKitContext.Provider value={styleKit.current}>
                <MainStackComponent env={env} />
              </StyleKitContext.Provider>
            </ActionSheetProvider>
          </ThemeProvider>
        </>
      )}
    </NavigationContainer>
  );
};

/**
 * AppGroupInstance is only created once per application lifetime
 * so it is created outside of a component
 */
const AppGroupInstance = new ApplicationGroup();
AppGroupInstance.initialize();

export const App = (props: { env: 'prod' | 'dev' }) => {
  const applicationGroupRef = useRef(AppGroupInstance);
  const [application, setApplication] = useState<
    MobileApplication | undefined
  >();
  useEffect(() => {
    const removeAppChangeObserver = applicationGroupRef.current.addApplicationChangeObserver(
      () => {
        const mobileApplication = applicationGroupRef.current
          .primaryApplication as MobileApplication;
        setApplication(mobileApplication);
      }
    );
    return removeAppChangeObserver;
  }, [applicationGroupRef.current.primaryApplication]);
  return (
    <ApplicationContext.Provider value={application}>
      {application && (
        <AppComponent
          env={props.env}
          key={application.Uuid}
          application={application}
        />
      )}
    </ApplicationContext.Provider>
  );
};

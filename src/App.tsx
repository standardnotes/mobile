import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { MobileApplication } from '@Lib/application';
import { ApplicationGroup } from '@Lib/application_group';
import { navigationRef } from '@Lib/navigation_service';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { DeinitSource } from '@standardnotes/snjs';
import { MobileThemeVariables } from '@Style/Themes/styled-components';
import { ThemeService, ThemeServiceContext } from '@Style/theme_service';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'react-native';
import Toast from 'react-native-toast-message';
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
  const themeService = useRef<ThemeService>();
  const appReady = useRef(false);
  const navigationReady = useRef(false);
  const [activeTheme, setActiveTheme] = useState<
    MobileThemeVariables | undefined
  >();

  const setThemeServiceRef = useCallback((node: ThemeService | undefined) => {
    if (node) {
      node.addThemeChangeObserver(() => {
        setActiveTheme(node.variables);
      });
    }

    /**
     * We check if both application and navigation are ready and launch application afterwads
     */
    themeService.current = node;
  }, []);

  /**
   * We check if both application and navigation are ready and launch application afterwads
   */
  const launchApp = useCallback(
    (setAppReady: boolean, setNavigationReady: boolean) => {
      if (setAppReady) {
        appReady.current = true;
      }
      if (setNavigationReady) {
        navigationReady.current = true;
      }
      if (navigationReady.current && appReady.current) {
        application.launch();
      }
    },
    [application]
  );

  useEffect(() => {
    let themeServiceInstance: ThemeService;
    const loadApplication = async () => {
      themeServiceInstance = new ThemeService(application);
      setThemeServiceRef(themeServiceInstance);
      await application?.prepareForLaunch({
        receiveChallenge: async challenge => {
          application!.promptForChallenge(challenge);
        },
      });
      await themeServiceInstance.init();
      launchApp(true, false);
    };

    loadApplication();

    return () => {
      themeServiceInstance?.deinit();
      setThemeServiceRef(undefined);
      if (!application.hasStartedDeinit()) {
        application.deinit(DeinitSource.Lock);
      }
    };
  }, [application, application.Uuid, env, launchApp, setThemeServiceRef]);

  if (!themeService.current || !activeTheme) {
    return null;
  }

  return (
    <NavigationContainer
      onReady={() => launchApp(false, true)}
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
      {themeService.current && (
        <>
          <ThemeProvider theme={activeTheme}>
            <ActionSheetProvider>
              <ThemeServiceContext.Provider value={themeService.current}>
                <MainStackComponent env={env} />
              </ThemeServiceContext.Provider>
            </ActionSheetProvider>
          </ThemeProvider>
        </>
      )}
      <Toast />
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
    const removeAppChangeObserver =
      applicationGroupRef.current.addApplicationChangeObserver(() => {
        const mobileApplication = applicationGroupRef.current
          .primaryApplication as MobileApplication;
        setApplication(mobileApplication);
      });
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

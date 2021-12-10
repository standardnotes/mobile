import { PrefKey } from '@Lib/preferences_manager';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStackNavigationProp } from '@Root/AppStack';
import { SCREEN_NOTES } from '@Screens/screens';
import {
  ButtonType,
  ComponentArea,
  LiveItem,
  SNComponent,
  SNNote,
} from '@standardnotes/snjs';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  OnShouldStartLoadWithRequest,
  WebViewMessageEvent,
} from 'react-native-webview/lib/WebViewTypes';
import {
  DeprecatedContainer,
  DeprecatedIcon,
  DeprecatedText,
  FlexContainer,
  LockedContainer,
  LockedText,
  StyledIcon,
  StyledWebview,
} from './ComponentView.styled';

type Props = {
  componentUuid: string;
  note: SNNote;
  onLoadEnd: () => void;
  onLoadStart: () => void;
  onLoadError: () => void;
};

export const ComponentView = ({
  onLoadEnd,
  onLoadError,
  onLoadStart,
  componentUuid,
}: Props) => {
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [liveComponent, setLiveComponent] = useState<
    LiveItem<SNComponent> | undefined
  >(() => new LiveItem(componentUuid, application!));
  const [url, setUrl] = useState('');
  const [showWebView, setShowWebView] = useState<boolean>(true);

  // Ref
  const webViewRef = useRef<WebView>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  const navigation = useNavigation<
    AppStackNavigationProp<typeof SCREEN_NOTES>['navigation']
  >();

  useEffect(() => {
    const removeBlurScreenListener = navigation.addListener('blur', () => {
      setShowWebView(false);
    });

    return removeBlurScreenListener;
  });

  useFocusEffect(() => {
    setShowWebView(true);
  });

  useEffect(() => {
    if (liveComponent?.item.uuid !== componentUuid) {
      setLiveComponent(new LiveItem(componentUuid, application!));
    }
  }, [application, liveComponent?.item.uuid, componentUuid]);

  useEffect(() => {
    const warnIfUnsupportedEditors = async () => {
      let platformVersionRequirements;

      switch (Platform.OS) {
        case 'ios':
          if (parseInt(Platform.Version.toString(), 10) < 11) {
            // WKWebView has issues on iOS < 11
            platformVersionRequirements = 'iOS 11 or greater';
          }
          break;
        case 'android':
          if (Platform.Version <= 23) {
            /**
             * postMessage doesn't work on Android <= 6 (API version 23)
             * https://github.com/facebook/react-native/issues/11594
             */
            platformVersionRequirements = 'Android 7.0 or greater';
          }
          break;
      }

      if (!platformVersionRequirements) {
        return;
      }

      const doNotShowAgainUnsupportedEditors = application
        ?.getLocalPreferences()
        .getValue(PrefKey.DoNotShowAgainUnsupportedEditors, false);

      if (!doNotShowAgainUnsupportedEditors) {
        const alertText =
          `Web editors require ${platformVersionRequirements}. ` +
          'Your version does not support web editors. ' +
          'Changes you make may not be properly saved. Please switch to the Plain Editor for the best experience.';

        const confirmed = await application?.alertService?.confirm(
          alertText,
          'Editors Not Supported',
          "Don't show again",
          ButtonType.Info,
          'OK'
        );

        if (confirmed) {
          application
            ?.getLocalPreferences()
            .setUserPrefValue(PrefKey.DoNotShowAgainUnsupportedEditors, true);
        }
      }
    };

    warnIfUnsupportedEditors();
  }, [application]);

  useEffect(() => {
    if (liveComponent) {
      const newUrl = application!.componentManager!.urlForComponent(
        liveComponent.item
      );
      if (!newUrl) {
        application?.alertService!.alert(
          'Re-install Extension',
          'This extension is not installed correctly. Please use the web or desktop application to reinstall, then try again.',
          'OK'
        );
      } else {
        setUrl(newUrl);
      }
    }

    // deinit
    return () => {
      application?.componentManager.onComponentIframeDestroyed(componentUuid);
      application?.componentGroup.deactivateComponentForArea(
        ComponentArea.Editor
      );
      liveComponent?.deinit();
    };
  }, [application, liveComponent, componentUuid]);

  const onMessage = (event: WebViewMessageEvent) => {
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch (e) {
      console.log('Message is not valid JSON, returning');
      return;
    }
    application!.componentManager?.handleMessage(liveComponent!.item!, data);
  };

  const onFrameLoad = useCallback(() => {
    /**
     * We have no way of knowing if the webview load is successful or not. We
     * have to wait to see if the error event is fired. Looking at the code,
     * the error event is fired right after this, so we can wait just a few ms
     * to see if the error event is fired before registering the component
     * window. Otherwise, on error, this component will be dealloced, and a
     * pending postMessage will cause a memory leak crash on Android in the
     * form of "react native attempt to invoke virtual method double java.lang.double.doublevalue() on a null object reference"
     */
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      application!.componentManager?.registerComponentWindow(
        liveComponent!.item!,
        webViewRef.current
      );
    }, 1);

    /**
     * The parent will remove their loading screen on load end. We want to
     * delay this by 100 to avoid flicker that may result if using a dark theme.
     * This delay will allow editor to load its theme.
     */
    setTimeout(() => {
      onLoadEnd();
    }, 100);
  }, [application, liveComponent, onLoadEnd]);

  const onLoadStartHandler = () => {
    onLoadStart();
  };

  const onLoadErrorHandler = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onLoadError();
  };

  const onShouldStartLoadWithRequest: OnShouldStartLoadWithRequest = request => {
    /**
     * We want to handle link clicks within an editor by opening the browser
     * instead of loading inline. On iOS, onShouldStartLoadWithRequest is
     * called for all requests including the initial request to load the editor.
     * On iOS, clicks in the editors have a navigationType of 'click', but on
     * Android, this is not the case (no navigationType).
     * However, on Android, this function is not called for the initial request.
     * So that might be one way to determine if this request is a click or the
     * actual editor load request. But I don't think it's safe to rely on this
     * being the case in the future. So on Android, we'll handle url loads only
     * if the url isn't equal to the editor url.
     */

    if (
      (Platform.OS === 'ios' && request.navigationType === 'click') ||
      (Platform.OS === 'android' && request.url !== url)
    ) {
      application!.deviceInterface!.openUrl(request.url);
      return false;
    }
    return true;
  };

  const defaultInjectedJavaScript = () => {
    return `(function() {
      window.parent.postMessage = function(data) {
        window.parent.ReactNativeWebView.postMessage(data);
      };
      return true;
    })()`;
  };

  const deprecationMessage =
    liveComponent?.item.package_info.deprecation_message;

  return (
    <FlexContainer>
      {liveComponent?.item.isExpired && (
        <LockedContainer>
          <StyledIcon />
          <LockedText>
            Subscription expired. Editors are in a read-only state. To edit
            immediately, please switch to the Plain Editor.
          </LockedText>
        </LockedContainer>
      )}

      {liveComponent?.item.isDeprecated && (
        <DeprecatedContainer>
          <DeprecatedIcon />
          <DeprecatedText>
            {deprecationMessage || 'This extension is deprecated.'}
          </DeprecatedText>
        </DeprecatedContainer>
      )}

      {Boolean(url) && (
        <StyledWebview
          showWebView={showWebView}
          source={{ uri: url }}
          key={liveComponent?.item.uuid}
          ref={webViewRef}
          /**
           * onLoad and onLoadEnd seem to be the same exact thing, except
           * that when an error occurs, onLoadEnd is called twice, whereas
           * onLoad is called once (what we want)
           */
          onLoad={onFrameLoad}
          onLoadStart={onLoadStartHandler}
          onError={onLoadErrorHandler}
          onMessage={onMessage}
          hideKeyboardAccessoryView={true}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          cacheEnabled={true}
          scalesPageToFit={
            true /* Android only, not available with WKWebView */
          }
          autoManageStatusBarEnabled={
            false /* To prevent StatusBar from changing colors when focusing */
          }
          injectedJavaScript={defaultInjectedJavaScript()}
        />
      )}
    </FlexContainer>
  );
};

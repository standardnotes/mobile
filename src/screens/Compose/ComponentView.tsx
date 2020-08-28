import { ApplicationContext } from '@Root/ApplicationContext';
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
import { ComponentAction, ComponentArea, LiveItem, SNComponent } from 'snjs';
import {
  FlexContainer,
  LockedContainer,
  LockedText,
  StyledIcon,
  StyledWebview,
} from './ComponentView.styled';

type Props = {
  componentUuid: string;
  noteUuid: string;
  onLoadEnd: () => void;
  onLoadStart: () => void;
  onLoadError: () => void;
};

export const ComponentView = ({
  onLoadEnd,
  onLoadError,
  onLoadStart,
  noteUuid,
  componentUuid,
}: Props): JSX.Element => {
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [liveComponent, setLiveComponent] = useState<
    LiveItem<SNComponent> | undefined
  >(() => new LiveItem(componentUuid, application!));
  const [url, setUrl] = useState('');

  // Ref
  const webViewRef = useRef<WebView>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (liveComponent?.item.uuid !== componentUuid) {
      setLiveComponent(new LiveItem(componentUuid, application!));
    }
  }, [application, liveComponent?.item.uuid, componentUuid]);

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
      application?.componentGroup.deactivateComponentForArea(
        ComponentArea.Editor
      );
      liveComponent?.deinit();
    };
  }, [application, liveComponent]);

  useEffect(() => {
    let unregisterComponentHandler: (() => void) | undefined;
    const note = application?.findItem(noteUuid);
    if (note && liveComponent) {
      unregisterComponentHandler = application?.componentManager!.registerHandler(
        {
          identifier: 'component-view-' + Math.random(),
          areas: [liveComponent.item.area],
          actionHandler: (currentComponent, action, data) => {
            if (action === ComponentAction.SetSize) {
              application.componentManager!.handleSetSizeEvent(
                currentComponent,
                data
              );
            }
          },
          contextRequestHandler: () => application?.findItem(noteUuid),
        }
      );
    }

    return () => {
      unregisterComponentHandler && unregisterComponentHandler();
    };
  }, [application, liveComponent, noteUuid]);

  const onMessage = (event: WebViewMessageEvent) => {
    // if (!this.note) {
    //   /** May be the case in tablet mode on app launch */
    //   return;
    // }

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

  return (
    <FlexContainer>
      {liveComponent?.item.valid_until &&
        liveComponent?.item.valid_until <= new Date() && (
          <LockedContainer>
            <StyledIcon />
            <LockedText>
              Extended expired. Editors are in a read-only state. To edit
              immediately, please switch to the Plain Editor.
            </LockedText>
          </LockedContainer>
        )}
      {Boolean(url) && (
        <StyledWebview
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

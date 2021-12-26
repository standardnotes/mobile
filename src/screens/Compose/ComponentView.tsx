/* eslint-disable prettier/prettier */
import { PrefKey } from '@Lib/preferences_manager';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStackNavigationProp } from '@Root/AppStack';
import { SCREEN_NOTES } from '@Screens/screens';
import { ComponentArea, Features } from '@standardnotes/features';
import {
  ButtonType,
  FeatureIdentifier,
  isRightVersionGreaterThanLeft,
  LiveItem,
  SNComponent,
  SNLog,
  SNNote,
} from '@standardnotes/snjs';
import { FeatureDescription } from '@standardnotes/features';
const FeatureChecksums = require('@standardnotes/features/dist/static/checksums.json');
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import RNFS, { DocumentDirectoryPath } from 'react-native-fs';
import StaticServer from 'react-native-static-server';
import { WebView } from 'react-native-webview';
import {
  OnShouldStartLoadWithRequest,
  WebViewMessageEvent,
} from 'react-native-webview/lib/WebViewTypes';
import { unzip } from 'react-native-zip-archive';
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
  onDownloadEditorStart: () => void;
  onDownloadEditorEnd: () => void;
  onDownloadError: () => void;
  downloadError: boolean;
  offlineOnly?: boolean;
};

const STATIC_SERVER_PORT = 8080;
const BASE_DOCUMENTS_PATH = DocumentDirectoryPath;
const EDITORS_PATH = '/editors';

const log = (message?: any, ...optionalParams: any[]) => {
  const LOGGING_ENABLED = true;
  if (LOGGING_ENABLED) {
    console.log(message, optionalParams, '\n\n');
    console.log('\n\n');
  }
};

export const ComponentView = ({
  onLoadEnd,
  onLoadError,
  onLoadStart,
  onDownloadEditorStart,
  onDownloadEditorEnd,
  onDownloadError,
  downloadError,
  componentUuid,
  offlineOnly,
}: Props) => {
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [liveComponent, setLiveComponent] = useState<
    LiveItem<SNComponent> | undefined
  >(() => new LiveItem(componentUuid, application!));
  const [url, setUrl] = useState<string | undefined>();
  const [showWebView, setShowWebView] = useState<boolean>(true);
  const [
    downloadingOfflineEditor,
    setDownloadingOfflineEditor,
  ] = useState<boolean>(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [staticServer, setStaticServer] = useState<StaticServer>();
  const [staticServerUrl, setStaticServerUrl] = useState('');

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
  }, [navigation]);

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

  const passesChecksumValidation = useCallback(
    async (filePath: string, featureIdentifier: FeatureIdentifier) => {
      log('Performing checksum verification on', filePath);
      const zipContents = await RNFS.readFile(filePath, 'base64');
      const checksum = await application!.protocolService.crypto.sha256(zipContents);
      log(`Got checksum ${checksum} for ${featureIdentifier}`);

      const desiredChecksum = FeatureChecksums[featureIdentifier]?.base64;
      if (!desiredChecksum) {
        log(`Checksum is missing for ${featureIdentifier}; aborting installation`);
        onDownloadError();
        return false;
      }
      if (checksum !== desiredChecksum) {
        log(`Checksums don't match for ${featureIdentifier}; ${checksum} != ${desiredChecksum}; aborting install`);
        onDownloadError();
        return false;
      }

      return true;
    }, [application, onDownloadError]);

  const downloadEditor = useCallback(
    async (identifier: FeatureIdentifier, downloadUrl) => {
      setDownloadingOfflineEditor(true);
      onDownloadEditorStart();

      try {
        const tmpLocation = `${BASE_DOCUMENTS_PATH}/${identifier}.zip`;

        if (await RNFS.exists(tmpLocation)) {
          log('Deleting file at', tmpLocation);
          await RNFS.unlink(tmpLocation);
        }

        log('Downloading editor', identifier, 'from url', downloadUrl, 'to location', tmpLocation);
        await RNFS.downloadFile({
          fromUrl: downloadUrl,
          toFile: tmpLocation,
        }).promise;
        log('Finished download to tmp location', tmpLocation);

        const requireChecksumVerification = !!nativeFeatureForIdentifier(identifier);
        if (requireChecksumVerification) {
          const passes = await passesChecksumValidation(tmpLocation, identifier);
          if (!passes) {
            return;
          }
        }

        const editorPath = pathForEditor(identifier);
        log(`Attempting to unzip ${tmpLocation} to ${editorPath}`);
        await unzip(tmpLocation, editorPath);
        log('Unzipped editor to', editorPath);
        await RNFS.unlink(tmpLocation);
      } catch (error) {
        onDownloadError();
        console.error(error);
      } finally {
        onDownloadEditorEnd();
        setDownloadingOfflineEditor(false);
      }
    },
    [onDownloadEditorStart, onDownloadEditorEnd, onDownloadError, passesChecksumValidation]
  );

  const pathForEditor = (identifier: FeatureIdentifier) => {
    return `${BASE_DOCUMENTS_PATH}${EDITORS_PATH}/${identifier}`;
  };

  const nativeFeatureForIdentifier = (identifier: FeatureIdentifier) => {
    return Features.find((feature: FeatureDescription) => feature.identifier === identifier);
  };

  const getDownloadedEditorPackageJsonFile = useCallback(async (
    identifier: FeatureIdentifier
  ): Promise<Record<string, any> | undefined> => {
    const editorPath = pathForEditor(identifier);
    if (!await RNFS.exists(editorPath)) {
      return undefined;
    }
    const filePath = `${editorPath}/package.json`;
    if (!await RNFS.exists(filePath)) {
      return undefined;
    }
    const fileContents = await RNFS.readFile(filePath);
    if (!fileContents) {
      return undefined;
    }
    const packageJson = JSON.parse(fileContents);
    return packageJson;
  }, []);

  const getOfflineEditorUrl = useCallback(async () => {
    if (!liveComponent) {
      return undefined;
    }

    const identifier = liveComponent.item.package_info.identifier;
    const nativeFeature = nativeFeatureForIdentifier(identifier);
    const version = nativeFeature?.version || liveComponent.item.package_info.version;
    const downloadUrl = nativeFeature?.download_url || liveComponent.item.package_info.download_url;

    const existingPackageJson = await getDownloadedEditorPackageJsonFile(
      identifier
    );
    const existingVersion = existingPackageJson?.version;
    log('Existing package version', existingVersion);

    const shouldDownload =
      !downloadError &&
      !downloadingOfflineEditor &&
      (!existingPackageJson ||
        isRightVersionGreaterThanLeft(existingVersion, version));

    if (shouldDownload) {
      await downloadEditor(identifier, downloadUrl);
    } else {
      log(`Not downloading editor ${identifier}`, downloadError, downloadingOfflineEditor);
    }

    const editorPath = pathForEditor(identifier);
    if (!(await RNFS.exists(editorPath))) {
      log(`No editor exists at path ${editorPath}, not using offline editor`);
      return undefined;
    }

    let mainFilePath, mainFileName;

    if (nativeFeature) {
      mainFileName = nativeFeature.index_path;
      mainFilePath = `${editorPath}/${nativeFeature.index_path}`;
    } else {
      const packageJson = await getDownloadedEditorPackageJsonFile(
        identifier
      );
      mainFileName = packageJson?.sn?.main || 'index.html';
      mainFilePath = `${editorPath}/${mainFileName}`;
    }

    const splitPackagePath = editorPath.split(EDITORS_PATH);
    const relativePackagePath = splitPackagePath[splitPackagePath.length - 1];
    const relativeMainFilePath = `${relativePackagePath}/${mainFileName}`;

    if (!(await staticServer?.isRunning())) {
      log('Server is not running; cannot use offline editor');
      return undefined;
    }

    if ((await RNFS.exists(mainFilePath))) {
      return `${staticServerUrl}${relativeMainFilePath}`;
    } else {
      log(`No editor exists at path ${mainFilePath}. Not using offline editor.`);
    }
  }, [
    downloadEditor,
    downloadError,
    downloadingOfflineEditor,
    liveComponent,
    staticServer,
    staticServerUrl,
    getDownloadedEditorPackageJsonFile,
  ]);

  const onLoadErrorHandler = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    onLoadError();
  }, [onLoadError, timeoutRef]);

  useEffect(() => {
    if (!staticServerUrl) {
      return;
    }
    const asyncFunc = async () => {
      const offlineEditorUrl = await getOfflineEditorUrl();
      if (offlineEditorUrl) {
        log('Using offline URL', offlineEditorUrl);
        setUrl(offlineEditorUrl);
        return;
      }

      const requiredOffline = offlineOnly || nativeFeatureForIdentifier(
        liveComponent!.item.identifier
      );
      if (requiredOffline) {
        log('No offline URL available but is required; not loading any editor.');
        onLoadErrorHandler();
        return;
      }

      const hostedUrl = application!.componentManager.urlForComponent(
        liveComponent!.item
      );
      log('Using hosted URL', hostedUrl);
      setUrl(hostedUrl as any);

      if (!hostedUrl) {
        application?.alertService!.alert(
          'Re-install Extension',
          'This extension is not installed correctly. Please use the web ' +
          'or desktop application to reinstall, then try again.',
          'OK'
        );
      }
    };

    asyncFunc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveComponent, staticServerUrl]);

  useEffect(() => {
    return () => {
      application?.componentManager.deactivateComponent(componentUuid);
      liveComponent?.deinit();
    };
  }, [application, componentUuid, liveComponent]);

  useEffect(() => {
    const path = `${BASE_DOCUMENTS_PATH}${EDITORS_PATH}`;
    let server: StaticServer;

    const startStaticServer = async () => {
      server = new StaticServer(STATIC_SERVER_PORT, path, {
        localOnly: true,
      });
      try {
        const serverUrl = await server.start();
        setStaticServer(server);
        setStaticServerUrl(serverUrl);
      } catch (e: unknown) {
        SNLog.error(e as any);
      }
    };
    startStaticServer();

    return () => {
      server?.stop();
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
      log('Message is not valid JSON, returning');
      return;
    }
    application!.componentManager?.handleMessage(liveComponent!.item!, data);
  };

  const onFrameLoad = useCallback(() => {
    setLoadedOnce(true);

    /**
     * We have no way of knowing if the webview load is successful or not. We
     * have to wait to see if the error event is fired. Looking at the code,
     * the error event is fired right after this, so we can wait just a few ms
     * to see if the error event is fired before registering the component
     * window. Otherwise, on error, this component will be dealloced, and a
     * pending postMessage will cause a memory leak crash on Android in the
     * form of "react native attempt to invoke virtual method
     * double java.lang.double.doublevalue() on a null object reference"
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
    }, 200);
  }, [application, liveComponent, onLoadEnd]);

  const onLoadStartHandler = () => {
    onLoadStart();
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
      const meta = document.createElement('meta');
      meta.setAttribute('content', 'width=device-width, initial-scale=1, user-scalable=no');
      meta.setAttribute('name', 'viewport');
      document.getElementsByTagName('head')[0].appendChild(meta);
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
      {(Boolean(url)) && (
        <StyledWebview
          showWebView={showWebView}
          source={
            /**
             * Android 10 workaround to avoid access denied errors
             * https://github.com/react-native-webview/react-native-webview/issues/656#issuecomment-551312436
             */
            loadedOnce ? { uri: url! } : undefined
          }
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
          autoManageStatusBarEnabled={
            false /* To prevent StatusBar from changing colors when focusing */
          }
          injectedJavaScript={defaultInjectedJavaScript()}
          onContentProcessDidTerminate={onLoadErrorHandler}
        />
      )}
    </FlexContainer>
  );
};

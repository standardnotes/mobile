import {
  AppState,
  Platform,
  NativeModules,
  Linking,
  Alert,
  Keyboard,
  AppStateStatus,
  KeyboardEventListener,
  EmitterSubscription,
} from 'react-native';
import _ from 'lodash';
import KeysManager from '@Lib/keysManager';
import OptionsState from '@Lib/OptionsState';
import PrivilegesManager from '@Lib/snjs/privilegesManager';
import AuthenticationSourceLocalPasscode from '@Screens/Authentication/Sources/AuthenticationSourceLocalPasscode';
import AuthenticationSourceBiometric from '@Screens/Authentication/Sources/AuthenticationSourceBiometric';

const pjson = require('../../package.json');
const { PlatformConstants } = NativeModules;

export type AppStateType =
  | typeof ApplicationState.Launching
  | typeof ApplicationState.LosingFocus
  | typeof ApplicationState.Backgrounding
  | typeof ApplicationState.GainingFocus
  | typeof ApplicationState.ResumingFromBackground
  | typeof ApplicationState.Locking
  | typeof ApplicationState.Unlocking;

// AppStateEvents
export type AppStateEventType =
  | typeof ApplicationState.KeyboardChangeEvent
  | typeof ApplicationState.AppStateEventTabletModeChange
  | typeof ApplicationState.AppStateEventNoteSideMenuToggle;
export type TabletModeChangeData = {
  new_isInTabletMode: boolean;
  old_isInTabletMode: boolean;
};
export type NoteSideMenuToggleChange = {
  new_isNoteSideMenuCollapsed: boolean;
  old_isNoteSideMenuCollapsed: boolean;
};

type KeyboardChangeEventHandler = (
  event: typeof ApplicationState.KeyboardChangeEvent,
  data: undefined
) => void;
type SideMenuToogleEvent = (
  event: typeof ApplicationState.AppStateEventNoteSideMenuToggle,
  data: NoteSideMenuToggleChange
) => void;
type TableModeChageEvent = (
  event: typeof ApplicationState.AppStateEventTabletModeChange,
  data: TabletModeChangeData
) => void;
export type AppStateEventHandler =
  | KeyboardChangeEventHandler
  | SideMenuToogleEvent
  | TableModeChageEvent;

type Observer = {
  key: () => number;
  callback: (state: AppStateType) => void;
};

export default class ApplicationState {
  // When the app first launches
  static Launching = 'Launching' as 'Launching';

  // When the app enters into multitasking view, or control/notification center for iOS
  static LosingFocus = 'LosingFocus' as 'LosingFocus';

  // When the app enters the background completely
  static Backgrounding = 'Backgrounding' as 'Backgrounding';

  // When the app resumes from either the background or from multitasking switcher or notification center
  static GainingFocus = 'GainingFocus' as 'GainingFocus';

  // When the app resumes from the background
  static ResumingFromBackground = 'ResumingFromBackground' as 'ResumingFromBackground';

  // When the user enters their local passcode and/or fingerprint
  static Locking = 'Locking' as 'Locking';

  // When the user enters their local passcode and/or fingerprint
  static Unlocking = 'Unlocking' as 'Unlocking';

  /* Seperate events, unrelated to app state notifications */
  static AppStateEventTabletModeChange = 'AppStateEventTabletModeChange' as 'AppStateEventTabletModeChange';
  static AppStateEventNoteSideMenuToggle = 'AppStateEventNoteSideMenuToggle' as 'AppStateEventNoteSideMenuToggle';
  static KeyboardChangeEvent = 'KeyboardChangeEvent' as 'KeyboardChangeEvent';

  private static instance: ApplicationState;
  _isAndroid: boolean;
  observers: Observer[];
  eventSubscribers: AppStateEventHandler[];
  locked: boolean;
  keyboardDidShowListener: EmitterSubscription;
  keyboardDidHideListener: EmitterSubscription;
  keyboardHeight?: number;
  optionsState: OptionsState;
  loading: boolean = false;
  tabletMode: boolean = false;
  noteSideMenuCollapsed: boolean = false;
  ignoreStateChanges: boolean = false;
  mostRecentState?: AppStateType;
  didHandleApplicationStart: boolean = false;
  authenticationInProgress: boolean = false;
  static get() {
    if (!this.instance) {
      this.instance = new ApplicationState();
    }

    return this.instance;
  }

  constructor() {
    this.observers = [];
    this.optionsState = new OptionsState();
    this.eventSubscribers = [];
    this.locked = true;
    this._isAndroid = Platform.OS === 'android';

    this.setTabletModeEnabled(this.isTabletDevice);
    this.initializeOptions();

    AppState.addEventListener('change', this.handleAppStateChange);
    this.didLaunch();

    this.keyboardDidShowListener = Keyboard.addListener(
      'keyboardWillShow',
      this.keyboardDidShow
    );
    this.keyboardDidHideListener = Keyboard.addListener(
      'keyboardWillHide',
      this.keyboardDidHide
    );
  }

  keyboardDidShow: KeyboardEventListener = e => {
    this.keyboardHeight = e.endCoordinates.height;
    this.notifyEvent(ApplicationState.KeyboardChangeEvent);
  };

  keyboardDidHide: KeyboardEventListener = () => {
    this.keyboardHeight = 0;
    this.notifyEvent(ApplicationState.KeyboardChangeEvent);
  };

  getKeyboardHeight() {
    return this.keyboardHeight;
  }

  initializeOptions() {
    // Initialize Options (sort by, filter, selected tags, etc)
    this.optionsState.addChangeObserver(options => {
      if (!this.loading) {
        options.persist();
      }
    });

    this.optionsState.loadSaved();
  }

  getOptions() {
    return this.optionsState;
  }

  static getOptions() {
    return this.get().getOptions();
  }

  static get isAndroid() {
    return this.get().isAndroid;
  }

  static get isIOS() {
    return this.get().isIOS;
  }

  static get version() {
    return this.isAndroid ? pjson.versionAndroid : pjson.versionIOS;
  }

  get isAndroid() {
    return this._isAndroid;
  }

  get isIOS() {
    return !this._isAndroid;
  }

  get isTabletDevice() {
    const deviceType = PlatformConstants.interfaceIdiom;
    return deviceType === 'pad';
  }

  get isInTabletMode() {
    return this.tabletMode;
  }

  setTabletModeEnabled(enabled: boolean) {
    if (enabled !== this.tabletMode) {
      this.tabletMode = enabled;
      this.notifyEvent(ApplicationState.AppStateEventTabletModeChange, {
        new_isInTabletMode: enabled,
        old_isInTabletMode: !enabled,
      });
    }
  }

  get isNoteSideMenuCollapsed() {
    return this.noteSideMenuCollapsed;
  }

  setNoteSideMenuCollapsed(collapsed: boolean) {
    if (collapsed !== this.noteSideMenuCollapsed) {
      this.noteSideMenuCollapsed = collapsed;
      this.notifyEvent(ApplicationState.AppStateEventNoteSideMenuToggle, {
        new_isNoteSideMenuCollapsed: collapsed,
        old_isNoteSideMenuCollapsed: !collapsed,
      });
    }
  }

  addEventHandler(handler: AppStateEventHandler) {
    this.eventSubscribers.push(handler);
    return handler;
  }

  removeEventHandler(handler: AppStateEventHandler) {
    _.pull(this.eventSubscribers, handler);
  }

  notifyEvent(
    event: AppStateEventType,
    data?: TabletModeChangeData | NoteSideMenuToggleChange
  ) {
    for (const handler of this.eventSubscribers) {
      // @ts-ignore not working type
      handler(event, data);
    }
  }

  handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (this.ignoreStateChanges) {
      return;
    }

    // if the most recent state is not 'background' ('inactive'), then we're going
    // from inactive to active, which doesn't really happen unless you, say, swipe
    // notification center in iOS down then back up. We don't want to lock on this state change.
    const isResuming = nextAppState === 'active';
    const isResumingFromBackground =
      isResuming && this.mostRecentState === ApplicationState.Backgrounding;
    const isEnteringBackground = nextAppState === 'background';
    const isLosingFocus = nextAppState === 'inactive';

    if (isEnteringBackground) {
      this.notifyOfState(ApplicationState.Backgrounding);

      if (this.shouldLockApplication()) {
        this.lockApplication();
      }
    }

    if (isResumingFromBackground || isResuming) {
      if (isResumingFromBackground) {
        this.notifyOfState(ApplicationState.ResumingFromBackground);
      }

      // Notify of GainingFocus even if resuming from background
      this.notifyOfState(ApplicationState.GainingFocus);
    }

    if (isLosingFocus) {
      this.notifyOfState(ApplicationState.LosingFocus);

      // If a privileges authentication session is in progress, we don't want to lock the application
      // or return any sources. That's because while authenticating, Face ID prompts may trigger losing focus
      // notifications, causing the app to lock. If the user backgrouds the app during privilege authentication,
      // it will still be locked via the Backgrounding event.
      if (
        this.shouldLockApplication() &&
        !PrivilegesManager.get().authenticationInProgress()
      ) {
        this.lockApplication();
      }
    }

    /*
      Presumabely we added previous event tracking in case an app event was triggered before observers got the chance to register.
      If we are backgrounding or losing focus, I assume we no longer care about previous events that occurred.
      (This was added in relation to the issue where pressing the Android back button would reconstruct App and cause all events to be re-forwarded)
     */
    // if (isEnteringBackground || isLosingFocus) {
    //   this.clearPreviousState();
    // }
  };

  // Visibility change events are like active, inactive, background,
  // while non-app cycle events are custom events like locking and unlocking

  isAppVisibilityChange(state: AppStateType) {
    return ([
      ApplicationState.Launching,
      ApplicationState.LosingFocus,
      ApplicationState.Backgrounding,
      ApplicationState.GainingFocus,
      ApplicationState.ResumingFromBackground,
    ] as Array<AppStateType>).includes(state);
  }

  /* State Changes */

  // Sent from App.tsx
  receiveApplicationStartEvent() {
    if (this.didHandleApplicationStart) {
      return;
    }
    this.didHandleApplicationStart = true;
    var authProps = this.getAuthenticationPropsForAppState(
      ApplicationState.Launching
    );
    if (authProps.sources.length === 0) {
      this.unlockApplication();
    }
  }

  didLaunch() {
    this.notifyOfState(ApplicationState.Launching);
  }

  notifyOfState(state: AppStateType) {
    if (this.ignoreStateChanges) {
      return;
    }

    // Set most recent state before notifying observers, in case they need to query this value.
    this.mostRecentState = state;

    for (var observer of this.observers) {
      observer.callback(state);
    }
  }

  /* End State */

  /*
  Allows other parts of the code to perform external actions without triggering state change notifications.
  This is useful on Android when you present a share sheet and dont want immediate authentication to appear.
  */
  performActionWithoutStateChangeImpact(block: () => void) {
    this.ignoreStateChanges = true;
    block();
    setTimeout(() => {
      this.ignoreStateChanges = false;
    }, 350);
  }

  getMostRecentState() {
    return this.mostRecentState;
  }

  addStateObserver(callback: Observer['callback']) {
    const observer = { key: Math.random, callback };
    this.observers.push(observer);

    if (this.mostRecentState) {
      callback(this.mostRecentState);
    }

    return observer;
  }

  // clearPreviousState() {
  //   this.previousEvents = [];
  // }

  removeStateObserver(observer: Observer) {
    _.pull(this.observers, observer);
  }

  /* Locking / Unlocking */

  isLocked() {
    return this.locked;
  }

  isUnlocked() {
    return !this.locked;
  }

  shouldLockApplication() {
    const showPasscode =
      KeysManager.get().hasOfflinePasscode() &&
      KeysManager.get().passcodeTiming === 'immediately';
    const showBiometrics =
      KeysManager.get().hasBiometrics() &&
      KeysManager.get().biometricPrefs.timing === 'immediately';
    return showPasscode || showBiometrics;
  }

  lockApplication() {
    this.notifyOfState(ApplicationState.Locking);
    this.locked = true;
  }

  unlockApplication() {
    this.notifyOfState(ApplicationState.Unlocking);
    this.setAuthenticationInProgress(false);
    KeysManager.get().updateScreenshotPrivacy();
    this.locked = false;
  }

  setAuthenticationInProgress(inProgress: boolean) {
    this.authenticationInProgress = inProgress;
  }

  isAuthenticationInProgress() {
    return this.authenticationInProgress;
  }

  getAuthenticationPropsForAppState(state: AppStateType) {
    // We don't want to do anything on gaining focus, since that may be called extraenously,
    // when you come back from notification center, etc. Any immediate locking should be handled
    // LosingFocus anyway.
    if (
      !this.isAppVisibilityChange(state) ||
      state === ApplicationState.GainingFocus
    ) {
      return { sources: [] };
    }

    // If a privileges authentication session is in progress, we don't want to lock the application
    // or return any sources. That's because while authenticating, Face ID prompts may trigger losing focus
    // notifications, causing the app to lock.
    if (PrivilegesManager.get().authenticationInProgress()) {
      return { sources: [] };
    }

    const hasPasscode = KeysManager.get().hasOfflinePasscode();
    const hasBiometrics = KeysManager.get().hasBiometrics();

    let showPasscode = hasPasscode,
      showBiometrics = hasBiometrics;

    if (
      state === ApplicationState.Backgrounding ||
      state === ApplicationState.ResumingFromBackground ||
      state === ApplicationState.LosingFocus
    ) {
      showPasscode =
        hasPasscode && KeysManager.get().passcodeTiming === 'immediately';
      showBiometrics =
        hasBiometrics &&
        KeysManager.get().biometricPrefs.timing === 'immediately';
    }

    const title =
      showPasscode && showBiometrics
        ? 'Authentication Required'
        : showPasscode
        ? 'Passcode Required'
        : 'Fingerprint Required';

    let sources = [];
    if (showPasscode) {
      sources.push(new AuthenticationSourceLocalPasscode());
    }
    if (showBiometrics) {
      sources.push(new AuthenticationSourceBiometric());
    }

    return {
      title: title,
      sources: sources,
      onAuthenticate: this.unlockApplication.bind(this),
    };
  }

  static openURL(url: string) {
    const showAlert = () => {
      Alert.alert('Unable to Open', `Unable to open URL ${url}.`);
    };

    Linking.canOpenURL(url)
      .then(supported => {
        if (!supported) {
          showAlert();
        } else {
          return Linking.openURL(url);
        }
      })
      .catch(() => showAlert());
  }
}

import {
  ApplicationEvent,
  ApplicationService,
  Challenge,
  ChallengePrompt,
  ChallengeReason,
  ChallengeValidation,
  ContentType,
  isNullOrUndefined,
  PayloadSource,
  removeFromArray,
  SNNote,
  SNSmartTag,
  SNTag,
  SNUserPrefs,
  StorageKey,
  StorageValueModes,
} from '@standardnotes/snjs';
import {
  AppState,
  AppStateStatus,
  EmitterSubscription,
  InteractionManager,
  Keyboard,
  KeyboardEventListener,
  NativeModules,
  Platform,
} from 'react-native';
import FlagSecure from 'react-native-flag-secure-android';
import { hide, show } from 'react-native-privacy-snapshot';
import VersionInfo from 'react-native-version-info';
import { MobileApplication } from './application';
import { Editor } from './editor';
import { PrefKey } from './preferences_manager';

const pjson = require('../../package.json');
const { PlatformConstants } = NativeModules;

// eslint-disable-next-line no-shadow
export enum AppStateType {
  LosingFocus = 1,
  EnteringBackground = 2,
  GainingFocus = 3,
  ResumingFromBackground = 4,
  TagChanged = 5,
  EditorClosed = 6,
  PreferencesChanged = 7,
}

// eslint-disable-next-line no-shadow
export enum LockStateType {
  Locked = 1,
  Unlocked = 2,
}

// eslint-disable-next-line no-shadow
export enum AppStateEventType {
  KeyboardChangeEvent = 1,
  TabletModeChange = 2,
  DrawerOpen = 3,
}

export type TabletModeChangeData = {
  new_isInTabletMode: boolean;
  old_isInTabletMode: boolean;
};

// eslint-disable-next-line no-shadow
export enum UnlockTiming {
  Immediately = 'immediately',
  OnQuit = 'on-quit',
}

// eslint-disable-next-line no-shadow
export enum PasscodeKeyboardType {
  Default = 'default',
  Numeric = 'numeric',
}

// eslint-disable-next-line no-shadow
export enum MobileStorageKey {
  PasscodeKeyboardTypeKey = 'passcodeKeyboardType',
}

type EventObserverCallback = (
  event: AppStateEventType,
  data?: TabletModeChangeData
) => void | Promise<void>;
type ObserverCallback = (
  event: AppStateType,
  data?: any
) => void | Promise<void>;
type LockStateObserverCallback = (event: LockStateType) => void | Promise<void>;

export class ApplicationState extends ApplicationService {
  application: MobileApplication;
  observers: ObserverCallback[] = [];
  private stateObservers: EventObserverCallback[] = [];
  private lockStateObservers: LockStateObserverCallback[] = [];
  locked = true;
  keyboardDidShowListener?: EmitterSubscription;
  keyboardDidHideListener?: EmitterSubscription;
  keyboardHeight?: number;
  appEventObersever: any;
  selectedTag: SNTag = this.application.getSmartTags()[0];
  userPreferences?: SNUserPrefs;
  tabletMode: boolean = false;
  ignoreStateChanges: boolean = false;
  mostRecentState?: AppStateType;
  authenticationInProgress: boolean = false;
  multiEditorEnabled = false;
  screenshotPrivacyEnabled?: boolean;
  passcodeTiming?: UnlockTiming;
  biometricsTiming?: UnlockTiming;
  removeItemChangesListener?: () => void;
  removePreferencesLoadedListener?: () => void;

  constructor(application: MobileApplication) {
    super(application);
    this.application = application;
    this.setTabletModeEnabled(this.isTabletDevice);
    this.handleApplicationEvents();
    this.handleItemsChanges();

    AppState.addEventListener('change', this.handleReactNativeAppStateChange);

    this.keyboardDidShowListener = Keyboard.addListener(
      'keyboardWillShow',
      this.keyboardDidShow
    );
    this.keyboardDidHideListener = Keyboard.addListener(
      'keyboardWillHide',
      this.keyboardDidHide
    );
  }

  deinit() {
    this.appEventObersever();
    AppState.removeEventListener(
      'change',
      this.handleReactNativeAppStateChange
    );
    if (this.removeItemChangesListener) {
      this.removeItemChangesListener();
    }
    if (this.removePreferencesLoadedListener) {
      this.removePreferencesLoadedListener();
    }
    this.appEventObersever = undefined;
    this.observers.length = 0;
    this.keyboardDidShowListener = undefined;
    this.keyboardDidHideListener = undefined;
  }

  async onAppStart() {
    this.removePreferencesLoadedListener = this.prefService.addPreferencesLoadedObserver(
      () => {
        this.notifyOfStateChange(AppStateType.PreferencesChanged);
        const savedTagUuid: string | undefined = this.prefService.getValue(
          PrefKey.SelectedTagUuid,
          undefined
        );

        const savedTag = !isNullOrUndefined(savedTagUuid)
          ? (this.application.findItem(savedTagUuid) as SNTag) ||
            this.application
              .getSmartTags()
              .find(tag => tag.uuid === savedTagUuid)
          : undefined;
        if (savedTag) {
          this.setSelectedTag(savedTag, false);
        }
      }
    );

    await this.loadUnlockTiming();
    this.screenshotPrivacyEnabled =
      (await this.getScreenshotPrivacyEnabled()) ?? true;
    this.setAndroidScreenshotPrivacy(this.screenshotPrivacyEnabled);
  }

  async onAppLaunch() {
    MobileApplication.setPreviouslyLaunched();
  }

  /**
   * Registers an observer for App State change
   * @returns function that unregisters this observer
   */
  public addStateChangeObserver(callback: ObserverCallback) {
    this.observers.push(callback);
    return () => {
      removeFromArray(this.observers, callback);
    };
  }

  /**
   * Registers an observer for lock state change
   * @returns function that unregisters this observer
   */
  public addLockStateChangeObserver(callback: LockStateObserverCallback) {
    this.lockStateObservers.push(callback);
    return () => {
      removeFromArray(this.lockStateObservers, callback);
    };
  }

  /**
   * Registers an observer for App State Event change
   * @returns function that unregisters this observer
   */
  public addStateEventObserver(callback: EventObserverCallback) {
    this.stateObservers.push(callback);
    return () => {
      removeFromArray(this.stateObservers, callback);
    };
  }

  /**
   * Notify observers of ApplicationState change
   */
  private notifyOfStateChange(state: AppStateType, data?: any) {
    if (this.ignoreStateChanges) {
      return;
    }

    // Set most recent state before notifying observers, in case they need to query this value.
    this.mostRecentState = state;

    for (const observer of this.observers) {
      observer(state, data);
    }
  }

  /**
   * Notify observers of ApplicationState Events
   */
  private notifyEventObservers(
    event: AppStateEventType,
    data?: TabletModeChangeData
  ) {
    for (const observer of this.stateObservers) {
      observer(event, data);
    }
  }

  /**
   * Notify observers of ApplicationState Events
   */
  private notifyLockStateObservers(event: LockStateType) {
    for (const observer of this.lockStateObservers) {
      observer(event);
    }
  }

  private async loadUnlockTiming() {
    this.passcodeTiming = await this.getPasscodeTiming();
    this.biometricsTiming = await this.getBiometricsTiming();
  }

  public async setAndroidScreenshotPrivacy(enable: boolean) {
    if (Platform.OS === 'android') {
      enable ? FlagSecure.activate() : FlagSecure.deactivate();
    }
  }

  /**
   * Creates a new editor if one doesn't exist. If one does, we'll replace the
   * editor's note with an empty one.
   */
  async createEditor(title?: string) {
    const activeEditor = this.getActiveEditor();
    if (!activeEditor || this.multiEditorEnabled) {
      this.application.editorGroup.createEditor(undefined, title);
    } else {
      await activeEditor.reset(title);
    }
  }

  async openEditor(noteUuid: string) {
    const note = this.application.findItem(noteUuid) as SNNote;
    const activeEditor = this.getActiveEditor();
    if (!activeEditor || this.multiEditorEnabled) {
      this.application.editorGroup.createEditor(noteUuid);
    } else {
      activeEditor.setNote(note);
    }
    if (note && note.conflictOf) {
      InteractionManager.runAfterInteractions(() => {
        this.application?.changeAndSaveItem(note.uuid, mutator => {
          mutator.conflictOf = undefined;
        });
      });
    }
  }

  getActiveEditor() {
    return this.application.editorGroup.editors[0];
  }

  getEditors() {
    return this.application.editorGroup.editors;
  }

  closeEditor(editor: Editor) {
    this.notifyOfStateChange(AppStateType.EditorClosed);
    this.application.editorGroup.closeEditor(editor);
  }

  closeActiveEditor() {
    this.notifyOfStateChange(AppStateType.EditorClosed);
    this.application.editorGroup.closeActiveEditor();
  }

  closeAllEditors() {
    this.notifyOfStateChange(AppStateType.EditorClosed);
    this.application.editorGroup.closeAllEditors();
  }

  editorForNote(note: SNNote) {
    for (const editor of this.getEditors()) {
      if (editor.note?.uuid === note.uuid) {
        return editor;
      }
    }
  }

  private keyboardDidShow: KeyboardEventListener = e => {
    this.keyboardHeight = e.endCoordinates.height;
    this.notifyEventObservers(AppStateEventType.KeyboardChangeEvent);
  };

  private keyboardDidHide: KeyboardEventListener = () => {
    this.keyboardHeight = 0;
    this.notifyEventObservers(AppStateEventType.KeyboardChangeEvent);
  };

  /**
   * @returns Returns keybord height
   */
  getKeyboardHeight() {
    return this.keyboardHeight;
  }

  /**
   * Reacts to @SNNote and @SNTag Changes
   */
  private handleItemsChanges() {
    this.removeItemChangesListener = this.application!.streamItems(
      [ContentType.Note, ContentType.Tag],
      async (items, source) => {
        /** Close any editors for deleted/trashed/archived notes */
        if (source === PayloadSource.PreSyncSave) {
          const notes = items.filter(
            candidate => candidate.content_type === ContentType.Note
          ) as SNNote[];
          for (const note of notes) {
            const editor = this.editorForNote(note);
            if (!editor) {
              continue;
            }
            if (note.deleted) {
              this.closeEditor(editor);
            } else if (note.trashed && !this.selectedTag?.isTrashTag) {
              this.closeEditor(editor);
            } else if (note.archived && !this.selectedTag?.isArchiveTag) {
              this.closeEditor(editor);
            }
          }
        }
        if (this.selectedTag) {
          const matchingTag = items.find(
            candidate => candidate.uuid === this.selectedTag!.uuid
          );
          if (matchingTag) {
            this.selectedTag = matchingTag as SNTag;
          }
        }
      }
    );
  }

  /**
   * Registers for MobileApplication events
   */
  private handleApplicationEvents() {
    this.appEventObersever = this.application.addEventObserver(
      async eventName => {
        if (eventName === ApplicationEvent.Started) {
          this.locked = true;
        } else if (eventName === ApplicationEvent.Launched) {
          this.locked = false;
          this.notifyLockStateObservers(LockStateType.Unlocked);
        }
      }
    );
  }

  /**
   * Set selected @SNTag
   */
  public setSelectedTag(tag: SNTag, saveSelection: boolean) {
    if (this.selectedTag === tag) {
      return;
    }
    const previousTag = this.selectedTag;
    this.selectedTag = tag;

    if (saveSelection) {
      this.application
        .getPrefsService()
        .setUserPrefValue(PrefKey.SelectedTagUuid, tag.uuid);
    }

    this.notifyOfStateChange(AppStateType.TagChanged, {
      tag,
      previousTag,
    });
  }

  /**
   * @returns tags that are referencing note
   */
  public getNoteTags(note: SNNote) {
    return this.application.referencingForItem(note).filter(ref => {
      return ref.content_type === ContentType.Tag;
    }) as SNTag[];
  }

  /**
   * @returns notes this tag references
   */
  public getTagNotes(tag: SNTag) {
    if (tag.isSmartTag) {
      return this.application.notesMatchingSmartTag(tag as SNSmartTag);
    } else {
      return this.application.referencesForItem(tag).filter(ref => {
        return ref.content_type === ContentType.Note;
      }) as SNNote[];
    }
  }

  public getSelectedTag() {
    return this.selectedTag;
  }

  static get version() {
    return `${pjson['user-version']} (${VersionInfo.buildVersion})`;
  }

  get isTabletDevice() {
    const deviceType = PlatformConstants.interfaceIdiom;
    return deviceType === 'pad';
  }

  get isInTabletMode() {
    return this.tabletMode;
  }

  setTabletModeEnabled(enabledTabletMode: boolean) {
    if (enabledTabletMode !== this.tabletMode) {
      this.tabletMode = enabledTabletMode;
      this.notifyEventObservers(AppStateEventType.TabletModeChange, {
        new_isInTabletMode: enabledTabletMode,
        old_isInTabletMode: !enabledTabletMode,
      });
    }
  }

  getPasscodeTimingOptions() {
    return [
      {
        title: 'Immediately',
        key: UnlockTiming.Immediately,
        selected: this.passcodeTiming === UnlockTiming.Immediately,
      },
      {
        title: 'On Quit',
        key: UnlockTiming.OnQuit,
        selected: this.passcodeTiming === UnlockTiming.OnQuit,
      },
    ];
  }

  getBiometricsTimingOptions() {
    return [
      {
        title: 'Immediately',
        key: UnlockTiming.Immediately,
        selected: this.biometricsTiming === UnlockTiming.Immediately,
      },
      {
        title: 'On Quit',
        key: UnlockTiming.OnQuit,
        selected: this.biometricsTiming === UnlockTiming.OnQuit,
      },
    ];
  }

  private async checkAndLockApplication() {
    const isLocked = await this.application.isLocked();
    if (!isLocked) {
      const hasBiometrics = await this.application.hasBiometrics();
      const hasPasscode = this.application.hasPasscode();
      if (hasPasscode && this.passcodeTiming === UnlockTiming.Immediately) {
        await this.application.lock();
      } else if (
        hasBiometrics &&
        this.biometricsTiming === UnlockTiming.Immediately &&
        !this.locked
      ) {
        const challenge = new Challenge(
          [new ChallengePrompt(ChallengeValidation.Biometric)],
          ChallengeReason.ApplicationUnlock,
          false
        );
        this.application.promptForCustomChallenge(challenge);

        this.locked = true;
        this.notifyLockStateObservers(LockStateType.Locked);
        this.application.addChallengeObserver(challenge, {
          onComplete: () => {
            this.locked = false;
            this.notifyLockStateObservers(LockStateType.Unlocked);
          },
        });
      }
    }
  }

  /**
   * handles App State change from React Native
   */
  private handleReactNativeAppStateChange = async (
    nextAppState: AppStateStatus
  ) => {
    if (this.ignoreStateChanges) {
      return;
    }

    // if the most recent state is not 'background' ('inactive'), then we're going
    // from inactive to active, which doesn't really happen unless you, say, swipe
    // notification center in iOS down then back up. We don't want to lock on this state change.
    const isResuming = nextAppState === 'active';
    const isResumingFromBackground =
      isResuming && this.mostRecentState === AppStateType.EnteringBackground;
    const isEnteringBackground = nextAppState === 'background';
    const isLosingFocus = nextAppState === 'inactive';

    if (isEnteringBackground) {
      this.notifyOfStateChange(AppStateType.EnteringBackground);
      return this.checkAndLockApplication();
    }

    if (isResumingFromBackground || isResuming) {
      if (this.screenshotPrivacyEnabled) {
        hide();
      }

      if (isResumingFromBackground) {
        this.notifyOfStateChange(AppStateType.ResumingFromBackground);
      }

      // Notify of GainingFocus even if resuming from background
      this.notifyOfStateChange(AppStateType.GainingFocus);
      return;
    }

    if (isLosingFocus) {
      if (this.screenshotPrivacyEnabled) {
        show();
      }

      this.notifyOfStateChange(AppStateType.LosingFocus);
      return this.checkAndLockApplication();
    }
  };

  /**
   * Visibility change events are like active, inactive, background,
   * while non-app cycle events are custom events like locking and unlocking
   */
  isAppVisibilityChange(state: AppStateType) {
    return ([
      AppStateType.LosingFocus,
      AppStateType.EnteringBackground,
      AppStateType.GainingFocus,
      AppStateType.ResumingFromBackground,
    ] as Array<AppStateType>).includes(state);
  }

  private async getScreenshotPrivacyEnabled(): Promise<boolean | undefined> {
    return this.application.getValue(
      StorageKey.MobileScreenshotPrivacyEnabled,
      StorageValueModes.Nonwrapped
    );
  }

  private async getPasscodeTiming(): Promise<UnlockTiming | undefined> {
    return this.application.getValue(
      StorageKey.MobilePasscodeTiming,
      StorageValueModes.Nonwrapped
    );
  }

  private async getBiometricsTiming(): Promise<UnlockTiming | undefined> {
    return this.application.getValue(
      StorageKey.MobileBiometricsTiming,
      StorageValueModes.Nonwrapped
    );
  }

  public async setScreenshotPrivacyEnabled(enabled: boolean) {
    await this.application.setValue(
      StorageKey.MobileScreenshotPrivacyEnabled,
      enabled,
      StorageValueModes.Nonwrapped
    );
    this.screenshotPrivacyEnabled = enabled;
    this.setAndroidScreenshotPrivacy(enabled);
  }

  public async setPasscodeTiming(timing: UnlockTiming) {
    await this.application.setValue(
      StorageKey.MobilePasscodeTiming,
      timing,
      StorageValueModes.Nonwrapped
    );
    this.passcodeTiming = timing;
  }

  public async setBiometricsTiming(timing: UnlockTiming) {
    await this.application.setValue(
      StorageKey.MobileBiometricsTiming,
      timing,
      StorageValueModes.Nonwrapped
    );
    this.biometricsTiming = timing;
  }

  public async getPasscodeKeyboardType(): Promise<PasscodeKeyboardType> {
    return this.application.getValue(
      MobileStorageKey.PasscodeKeyboardTypeKey,
      StorageValueModes.Nonwrapped
    );
  }

  public async setPasscodeKeyboardType(type: PasscodeKeyboardType) {
    await this.application.setValue(
      MobileStorageKey.PasscodeKeyboardTypeKey,
      type,
      StorageValueModes.Nonwrapped
    );
  }

  public onDrawerOpen() {
    this.notifyEventObservers(AppStateEventType.DrawerOpen);
  }

  /*
  Allows other parts of the code to perform external actions without triggering state change notifications.
  This is useful on Android when you present a share sheet and dont want immediate authentication to appear.
  */
  async performActionWithoutStateChangeImpact(
    block: () => void | Promise<void>,
    notAwaited?: boolean
  ) {
    this.ignoreStateChanges = true;
    if (notAwaited) {
      block();
    } else {
      await block();
    }
    setTimeout(() => {
      this.ignoreStateChanges = false;
    }, 350);
  }

  getMostRecentState() {
    return this.mostRecentState;
  }

  private get prefService() {
    return this.application.getPrefsService();
  }

  public getEnvironment() {
    const bundleId = VersionInfo.bundleIdentifier;
    console.log(bundleId && bundleId.includes('dev'));
    return bundleId && bundleId.includes('dev') ? 'dev' : 'prod';
  }
}

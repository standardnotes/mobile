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
import { pull } from 'lodash';
import { MobileApplication } from './application';
import { Editor } from './editor';
import {
  SNNote,
  ContentType,
  PayloadSource,
  SNUserPrefs,
  SNTag,
  ApplicationEvent,
  SNSmartTag,
} from 'snjs';

const pjson = require('../../package.json');
const { PlatformConstants } = NativeModules;

export enum AppStateType {
  Launching = 1,
  LosingFocus = 2,
  EnteringBackground = 3,
  GainingFocus = 4,
  EditorFocused = 5,
  ResumingFromBackground = 6,
  Locking = 7,
  Unlocking = 8,
  TagChanged = 9,
  ActiveEditorChanged = 10,
  PreferencesChanged = 11,
}

export enum AppStateEventType {
  KeyboardChangeEvent = 1,
  AppStateEventTabletModeChange = 2,
  AppStateEventNoteSideMenuToggle = 3,
}

export type TabletModeChangeData = {
  new_isInTabletMode: boolean;
  old_isInTabletMode: boolean;
};
export type NoteSideMenuToggleChange = {
  new_isNoteSideMenuCollapsed: boolean;
  old_isNoteSideMenuCollapsed: boolean;
};

type EventObserverCallback = (
  event: AppStateEventType,
  data?: TabletModeChangeData | NoteSideMenuToggleChange
) => void | Promise<void>;
type ObserverCallback = (
  event: AppStateType,
  data?: any
) => void | Promise<void>;

export class ApplicationState {
  application: MobileApplication;
  observers: ObserverCallback[] = [];
  eventObservers: EventObserverCallback[] = [];
  locked = true;
  keyboardDidShowListener?: EmitterSubscription;
  keyboardDidHideListener?: EmitterSubscription;
  keyboardHeight?: number;
  appEventObersever: any;
  selectedTag?: SNTag;
  userPreferences?: SNUserPrefs;
  tabletMode: boolean = false;
  noteSideMenuCollapsed: boolean = false;
  ignoreStateChanges: boolean = false;
  mostRecentState?: AppStateType;
  authenticationInProgress: boolean = false;
  multiEditorEnabled = false;

  constructor(application: MobileApplication) {
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
    this.appEventObersever = undefined;
    this.observers.length = 0;
    this.keyboardDidShowListener = undefined;
    this.keyboardDidHideListener = undefined;
  }

  /**
   * Registers an observer for App State change
   * @returns function that unregisters this observer
   */
  public addStateChangeObserver(callback: ObserverCallback) {
    this.observers.push(callback);
    return () => {
      pull(this.observers, callback);
    };
  }

  /**
   * Registers an observer for App State Event change
   * @returns function that unregisters this observer
   */
  public addStateEventObserver(callback: EventObserverCallback) {
    this.eventObservers.push(callback);
    return () => {
      pull(this.eventObservers, callback);
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
    data?: TabletModeChangeData | NoteSideMenuToggleChange
  ) {
    for (const observer of this.eventObservers) {
      observer(event, data);
    }
  }

  /**
   * Creates a new editor if one doesn't exist. If one does, we'll replace the
   * editor's note with an empty one.
   */
  createEditor(title?: string) {
    const activeEditor = this.getActiveEditor();
    if (!activeEditor || this.multiEditorEnabled) {
      this.application.editorGroup.createEditor(undefined, title);
    } else {
      activeEditor.reset(title);
    }
  }

  async openEditor(noteUuid: string) {
    const note = this.application.findItem(noteUuid) as SNNote;
    const run = async () => {
      const activeEditor = this.getActiveEditor();
      if (!activeEditor || this.multiEditorEnabled) {
        this.application.editorGroup.createEditor(noteUuid);
      } else {
        activeEditor.setNote(note);
      }
      this.notifyOfStateChange(AppStateType.ActiveEditorChanged);
    };
    // TODO: protected note
    // if (
    //   note &&
    //   note.safeContent.protected &&
    //   (await this.application.privilegesService!.actionRequiresPrivilege(
    //     ProtectedAction.ViewProtectedNotes
    //   ))
    // ) {
    //   return new Promise(resolve => {
    //     this.application.presentPrivilegesModal(
    //       ProtectedAction.ViewProtectedNotes,
    //       () => {
    //         run().then(resolve);
    //       }
    //     );
    //   });
    // } else {
    //   return run();
    // }
    return run();
  }

  getActiveEditor() {
    return this.application.editorGroup.editors[0];
  }

  getEditors() {
    return this.application.editorGroup.editors;
  }

  closeEditor(editor: Editor) {
    this.application.editorGroup.closeEditor(editor);
  }

  closeActiveEditor() {
    this.application.editorGroup.closeActiveEditor();
  }

  closeAllEditors() {
    this.application.editorGroup.closeAllEditors();
  }

  editorForNote(note: SNNote) {
    for (const editor of this.getEditors()) {
      if (editor.note.uuid === note.uuid) {
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
    this.application!.streamItems(
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
        }
      }
    );
  }

  /**
   * Set selected @SNTag
   */
  setSelectedTag(tag: SNTag) {
    if (this.selectedTag === tag) {
      return;
    }
    const previousTag = this.selectedTag;
    this.selectedTag = tag;
    this.notifyOfStateChange(AppStateType.TagChanged, {
      tag: tag,
      previousTag: previousTag,
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
    if (tag.isSmartTag()) {
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

  setUserPreferences(preferences: SNUserPrefs) {
    this.userPreferences = preferences;
    this.notifyOfStateChange(AppStateType.PreferencesChanged);
  }

  static get version() {
    return Platform.select({
      ios: pjson.versionIOS,
      android: pjson.versionAndroid,
    });
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
      this.notifyEventObservers(
        AppStateEventType.AppStateEventTabletModeChange,
        {
          new_isInTabletMode: enabled,
          old_isInTabletMode: !enabled,
        }
      );
    }
  }

  get isNoteSideMenuCollapsed() {
    return this.noteSideMenuCollapsed;
  }

  setNoteSideMenuCollapsed(collapsed: boolean) {
    if (collapsed !== this.noteSideMenuCollapsed) {
      this.noteSideMenuCollapsed = collapsed;
      this.notifyEventObservers(
        AppStateEventType.AppStateEventNoteSideMenuToggle,
        {
          new_isNoteSideMenuCollapsed: collapsed,
          old_isNoteSideMenuCollapsed: !collapsed,
        }
      );
    }
  }

  /**
   * handles App State change from React Native
   */
  private handleReactNativeAppStateChange = (nextAppState: AppStateStatus) => {
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

      if (true) {
        // TODO: add lockManager
        this.application.lock();
      }
    }

    if (isResumingFromBackground || isResuming) {
      if (isResumingFromBackground) {
        this.notifyOfStateChange(AppStateType.ResumingFromBackground);
      }

      // Notify of GainingFocus even if resuming from background
      this.notifyOfStateChange(AppStateType.GainingFocus);
    }

    if (isLosingFocus) {
      this.notifyOfStateChange(AppStateType.LosingFocus);

      // If a privileges authentication session is in progress, we don't want to lock the application
      // or return any sources. That's because while authenticating, Face ID prompts may trigger losing focus
      // notifications, causing the app to lock. If the user backgrouds the app during privilege authentication,
      // it will still be locked via the Backgrounding event.
      // TODO: check this
      // if (
      //   this.shouldLockApplication() &&
      //   !PrivilegesManager.get().authenticationInProgress()
      // ) {
      //   this.lockApplication();
      // }
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
      AppStateType.Launching,
      AppStateType.LosingFocus,
      AppStateType.EnteringBackground,
      AppStateType.GainingFocus,
      AppStateType.ResumingFromBackground,
    ] as Array<AppStateType>).includes(state);
  }

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

  setAuthenticationInProgress(inProgress: boolean) {
    this.authenticationInProgress = inProgress;
  }

  isAuthenticationInProgress() {
    return this.authenticationInProgress;
  }
}

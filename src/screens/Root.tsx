import React from 'react';
import { TouchableHighlight, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SFAuthManager } from 'snjs';
import ApplicationState from '@Lib/ApplicationState';
import KeysManager from '@Lib/keysManager';
import Abstract from '@Screens/Abstract';
import Compose from '@Screens/Compose';
import Notes from '@Screens/Notes/Notes';
import { SCREEN_AUTHENTICATE } from '@Screens/screens';
import AlertManager from '@Lib/snjs/alertManager';
import Auth from '@Lib/snjs/authManager';
import ModelManager from '@Lib/snjs/modelManager';
import Sync from '@Lib/snjs/syncManager';
import StyleKit from '@Style/StyleKit';
import { hexToRGBA } from '@Style/utils';

export default class Root extends Abstract {
  constructor(props) {
    super(props);
    this.registerObservers();
  }

  registerObservers() {
    this.stateObserver = ApplicationState.get().addStateObserver(state => {
      const authProps = ApplicationState.get().getAuthenticationPropsForAppState(
        state
      );
      if (authProps.sources.length > 0) {
        this.presentAuthenticationModal(authProps);
      } else if (state === ApplicationState.GainingFocus) {
        // we only want to perform sync here if the app is resuming, not if it's a fresh start
        if (this.dataLoaded) {
          Sync.get().sync();
        }
      }
    });

    this.applicationStateEventHandler = ApplicationState.get().addEventHandler(
      (event, data) => {
        if (event === ApplicationState.AppStateEventNoteSideMenuToggle) {
          // update state to toggle Notes side menu if we triggered the collapse
          this.setState({
            notesListCollapsed: data.new_isNoteSideMenuCollapsed,
          });
        } else if (event === ApplicationState.KeyboardChangeEvent) {
          // need to refresh the height of the keyboard when it opens so that we can change the position
          // of the sidebar collapse icon
          if (ApplicationState.get().isInTabletMode) {
            this.setState({
              keyboardHeight: ApplicationState.get().getKeyboardHeight(),
            });
          }
        }
      }
    );

    this.syncEventHandler = Sync.get().addEventHandler(async (event, data) => {
      if (event === 'sync-session-invalid') {
        if (!this.didShowSessionInvalidAlert) {
          this.didShowSessionInvalidAlert = true;
          AlertManager.get().confirm({
            title: 'Session Expired',
            text:
              'Your session has expired. New changes will not be pulled in. Please sign out and sign back in to refresh your session.',
            confirmButtonText: 'Sign Out',
            onConfirm: () => {
              this.didShowSessionInvalidAlert = false;
              Auth.get().signout();
            },
            onCancel: () => {
              this.didShowSessionInvalidAlert = false;
            },
          });
        }
      }
    });

    this.syncStatusObserver = Sync.get().registerSyncStatusObserver(status => {
      if (status.error) {
        const text = 'Unable to connect to sync server.';
        this.showingErrorStatus = true;
        setTimeout(() => {
          // need timeout for syncing on app launch
          this.setSubTitle(text, StyleKit.variables.stylekitWarningColor);
        }, 250);
      } else if (status.retrievedCount > 20) {
        const text = `Downloading ${status.retrievedCount} items. Keep app open.`;
        this.setSubTitle(text);
        this.showingDownloadStatus = true;
      } else if (this.showingDownloadStatus) {
        this.showingDownloadStatus = false;
        const text = 'Download Complete.';
        this.setSubTitle(text);
        setTimeout(() => {
          this.setSubTitle(null);
        }, 2000);
      } else if (this.showingErrorStatus) {
        this.setSubTitle(null);
      }
    });

    this.signoutObserver = Auth.get().addEventHandler(async event => {
      if (event === SFAuthManager.DidSignOutEvent) {
        this.setSubTitle(null);
        const notifyObservers = false;
        ApplicationState.getOptions().reset(notifyObservers);
        this.reloadOptionsToDefault();
        ApplicationState.getOptions().notifyObservers();
      }
    });

    this.reloadOptionsToDefault();
  }

  reloadOptionsToDefault() {
    const options = ApplicationState.getOptions();
    if (options.selectedTagIds.length === 0) {
      // select default All notes smart tag
      options.setSelectedTagIds(ModelManager.get().defaultSmartTag().uuid);
    }
  }

  onUnlockPress = () => {
    const initialAppState = ApplicationState.Launching;
    const authProps = ApplicationState.get().getAuthenticationPropsForAppState(
      initialAppState
    );
    if (authProps.sources.length > 0) {
      this.presentAuthenticationModal(authProps);
    }
  };

  componentDidMount() {
    super.componentDidMount();

    if (this.authOnMount) {
      // Perform in timeout to avoid stutter when presenting modal on initial app start.
      setTimeout(() => {
        this.presentAuthenticationModal(this.authOnMount);
        this.authOnMount = null;
      }, 20);
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    ApplicationState.get().removeStateObserver(this.stateObserver);
    ApplicationState.get().removeEventHandler(
      this.applicationStateEventHandler
    );
    Sync.get().removeEventHandler(this.syncEventHandler);
    Sync.get().removeSyncStatusObserver(this.syncStatusObserver);
    clearInterval(this.syncTimer);
  }

  /* Forward React Navigation lifecycle events to notes */

  componentWillFocus() {
    super.componentWillFocus();
    this.notesRef && this.notesRef.componentWillFocus();
    this.composeRef && this.composeRef.componentWillFocus();
  }

  componentDidFocus() {
    super.componentDidFocus();
    this.notesRef && this.notesRef.componentDidFocus();
    this.composeRef && this.composeRef.componentDidFocus();
  }

  componentDidBlur() {
    super.componentDidBlur();
    this.notesRef && this.notesRef.componentDidBlur();
    this.composeRef && this.composeRef.componentDidBlur();
  }

  componentWillBlur() {
    super.componentWillBlur();
    this.notesRef && this.notesRef.componentWillBlur();
    this.composeRef && this.composeRef.componentWillBlur();
  }

  loadInitialState() {
    this.initializeData();
    this.beginSyncTimer();
    super.loadInitialState();
  }

  beginSyncTimer() {
    // Refresh every 30s
    this.syncTimer = setInterval(function () {
      Sync.get().sync(null);
    }, 30000);
  }

  initializeData() {
    const encryptionEnabled = KeysManager.get().isOfflineEncryptionEnabled();
    this.setSubTitle(
      encryptionEnabled ? 'Decrypting items...' : 'Loading items...'
    );
    const incrementalCallback = (current, total) => {
      const notesString = `${current}/${total} items...`;
      this.setSubTitle(
        encryptionEnabled
          ? `Decrypting ${notesString}`
          : `Loading ${notesString}`
      );
      // Incremental Callback
      if (!this.dataLoaded) {
        this.dataLoaded = true;
      }
      this.notesRef && this.notesRef.root_onIncrementalSync();
    };

    const loadLocalCompletion = items => {
      this.setSubTitle('Syncing...');
      this.dataLoaded = true;

      // perform initial sync
      Sync.get()
        .sync({ performIntegrityCheck: true })
        .then(() => {
          this.setSubTitle(null);
        });
    };

    if (Sync.get().initialDataLoaded()) {
      // Data can be already loaded in the case of a theme change
      loadLocalCompletion();
    } else {
      const batchSize = 100;
      Sync.get()
        .loadLocalItems({ incrementalCallback, batchSize })
        .then(items => {
          setTimeout(() => {
            loadLocalCompletion(items);
          });
        });
    }
  }

  presentAuthenticationModal(authProps) {
    if (!this.isMounted()) {
      console.log('Not yet mounted, not authing.');
      this.authOnMount = authProps;
      return;
    }

    if (this.authenticationInProgress) {
      console.log(
        'Not presenting auth modal because one is already presented.'
      );
      return;
    }

    this.authenticationInProgress = true;

    if (this.pendingAuthProps) {
      // Existing unvalidated auth props. Don't use input authProps.
      // This is to handle the case on Android where if a user has both
      // fingerprint (immediate) and passcode (on quit), they can press the
      // physical back button on launch to dismiss auth window, then come back
      // into app, and it will only ask for fingerprint. We'll clear
      // pendingAuthProps on success
      authProps = this.pendingAuthProps;
    } else {
      this.pendingAuthProps = authProps;
    }

    this.props.navigation.navigate(SCREEN_AUTHENTICATE, {
      authenticationSources: authProps.sources,
      onSuccess: () => {
        authProps.onAuthenticate();
        this.pendingAuthProps = null;
        this.authenticationInProgress = false;
        if (this.dataLoaded) {
          Sync.get().sync();
        }
      },
      onUnmount: () => {
        this.authenticationInProgress = false;
      },
    });
  }

  onNoteSelect = note => {
    this.composeRef.setNote(note);
    this.setState({
      selectedTagId:
        this.notesRef.options.selectedTagIds.length &&
        this.notesRef.options.selectedTagIds[0],
    });
  };

  onLayout = e => {
    const width = e.nativeEvent.layout.width;
    /**
      If you're in tablet mode, but on an iPad where this app is running side by
      side by another app, we only want to show the Compose window and not the
      list, because there isn't enough space.
    */
    const MinWidthToSplit = 450;
    if (ApplicationState.get().isTabletDevice) {
      if (width < MinWidthToSplit) {
        ApplicationState.get().setTabletModeEnabled(false);
      } else {
        ApplicationState.get().setTabletModeEnabled(true);
      }
    }

    this.setState({
      width: width,
      height: e.nativeEvent.layout.height,
      x: e.nativeEvent.layout.x,
      y: e.nativeEvent.layout.y,
      shouldSplitLayout: ApplicationState.get().isInTabletMode,
      notesListCollapsed: ApplicationState.get().isNoteSideMenuCollapsed,
      keyboardHeight: ApplicationState.get().getKeyboardHeight(),
    });
  };

  toggleNoteSideMenu = () => {
    if (!ApplicationState.get().isInTabletMode) {
      return;
    }

    ApplicationState.get().setNoteSideMenuCollapsed(
      !ApplicationState.get().isNoteSideMenuCollapsed
    );
  };

  render() {
    /* Don't render LockedView here since we need this.notesRef as soon as we can (for componentWillFocus callback) */

    const { shouldSplitLayout, notesListCollapsed } = this.state;

    const notesStyles = shouldSplitLayout
      ? [this.styles.left, { width: notesListCollapsed ? 0 : '40%' }]
      : [StyleKit.styles.container, { flex: 1 }];
    const composeStyles = shouldSplitLayout
      ? [this.styles.right, { width: notesListCollapsed ? '100%' : '60%' }]
      : null;

    const collapseIconPrefix = StyleKit.platformIconPrefix();
    const iconNames = {
      md: ['arrow-dropright', 'arrow-dropleft'],
      ios: ['arrow-forward', 'arrow-back'],
    };
    const collapseIconName =
      collapseIconPrefix +
      '-' +
      iconNames[collapseIconPrefix][notesListCollapsed ? 0 : 1];
    const collapseIconBottomPosition =
      this.state.keyboardHeight > this.state.height / 2
        ? this.state.keyboardHeight
        : '50%';

    return (
      <View
        testID="rootView"
        onLayout={this.onLayout}
        style={[StyleKit.styles.container, this.styles.root]}
      >
        <View style={notesStyles}>
          <Notes
            ref={ref => {
              this.notesRef = ref;
            }}
            onUnlockPress={this.onUnlockPress}
            navigation={this.props.navigation}
            onNoteSelect={
              shouldSplitLayout && this.onNoteSelect /* tablet only */
            }
          />
        </View>

        {shouldSplitLayout && (
          <View style={composeStyles}>
            <Compose
              ref={ref => {
                this.composeRef = ref;
              }}
              selectedTagId={this.state.selectedTagId}
              navigation={this.props.navigation}
            />

            <TouchableHighlight
              underlayColor={StyleKit.variables.stylekitBackgroundColor}
              style={[
                this.styles.toggleButtonContainer,
                this.styles.toggleButton,
                { bottom: collapseIconBottomPosition },
              ]}
              onPress={this.toggleNoteSideMenu}
            >
              <View>
                <Icon
                  name={collapseIconName}
                  size={24}
                  color={hexToRGBA(StyleKit.variables.stylekitInfoColor, 0.85)}
                />
              </View>
            </TouchableHighlight>
          </View>
        )}
      </View>
    );
  }

  loadStyles() {
    this.styles = {
      root: {
        flex: 1,
        flexDirection: 'row',
      },
      left: {
        borderRightColor: StyleKit.variables.stylekitBorderColor,
        borderRightWidth: 1,
      },
      right: {},
      toggleButtonContainer: {
        backgroundColor: hexToRGBA(
          StyleKit.variables.stylekitContrastBackgroundColor,
          0.5
        ),
      },
      toggleButton: {
        justifyContent: 'center',
        position: 'absolute',
        left: 0,
        padding: 7,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
        marginTop: -12,
      },
    };
  }
}

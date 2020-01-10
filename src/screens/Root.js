import React, { Component, Platform } from 'react';
import { TouchableHighlight, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LockedView from '@Containers/LockedView';
import ApplicationState from '@Lib/ApplicationState';
import KeysManager from '@Lib/keysManager';
import UserPrefsManager from '@Lib/userPrefsManager';
import Abstract from '@Screens/Abstract';
import Compose from '@Screens/Compose';
import Notes from '@Screens/Notes/Notes';
import {
  SCREEN_SPLASH,
  SCREEN_AUTHENTICATE
} from '@Screens/screens';
import AlertManager from '@SFJS/alertManager';
import Auth from '@SFJS/authManager';
import ModelManager from '@SFJS/modelManager';
import Sync from '@SFJS/syncManager';
import StyleKit from '@Style/StyleKit';

export default class Root extends Abstract {

  constructor(props) {
    super(props);
    this.registerObservers();
  }

  shouldPresentSplash() {
    // Prohibit offline functionality for first time users only (no notes)
    let offline = Auth.get().offline();
    let numNotes = ModelManager.get().noteCount();
    return offline && numNotes == 0;
  }

  async presentSplash() {
    const agreed = await UserPrefsManager.get().getAgreedToOfflineDisclaimer();

    if(!agreed) {
      this.props.navigation.navigate(SCREEN_SPLASH);
    }
  }

  registerObservers() {

    this.stateObserver = ApplicationState.get().addStateObserver((state) => {
      let authProps = ApplicationState.get().getAuthenticationPropsForAppState(state);
      if(authProps.sources.length > 0) {
        this.presentAuthenticationModal(authProps);
      }
      else if(state == ApplicationState.GainingFocus) {
        // we only want to perform sync here if the app is resuming, not if it's a fresh start
        if(this.dataLoaded) {
          Sync.get().sync();
        }
      }
    })

    this.applicationStateEventHandler = ApplicationState.get().addEventHandler((event, data) => {
      if(event == ApplicationState.AppStateEventNoteSideMenuToggle) {
        // update state to toggle Notes side menu if we triggered the collapse
        this.setState({notesListCollapsed: data.new_isNoteSideMenuCollapsed});
      }
      else if(event == ApplicationState.KeyboardChangeEvent) {
        // need to refresh the height of the keyboard when it opens so that we can change the position
        // of the sidebar collapse icon
        if(ApplicationState.get().isInTabletMode) {
          this.setState({keyboardHeight: ApplicationState.get().getKeyboardHeight()});
        }
      }
    })

    this.syncEventHandler = Sync.get().addEventHandler((event, data) => {
      if(event == "local-data-loaded") {
        if(this.shouldPresentSplash()) {
          this.presentSplash();
        }
      }
      else if(event == "sync-session-invalid") {
        if(!this.didShowSessionInvalidAlert) {
          this.didShowSessionInvalidAlert = true;
          AlertManager.get().confirm({
            title: "Session Expired",
            text: "Your session has expired. New changes will not be pulled in. Please sign out and sign back in to refresh your session.",
            confirmButtonText: "Sign Out",
            onConfirm: () => {
              this.didShowSessionInvalidAlert = false;
              Auth.get().signout();
            },
            onCancel: () => {
              this.didShowSessionInvalidAlert = false;
            }
          })
        }
      }
    })

    this.syncStatusObserver = Sync.get().registerSyncStatusObserver((status) => {
      if(status.error) {
        var text = `Unable to connect to sync server.`
        this.showingErrorStatus = true;
        setTimeout( () => {
          // need timeout for syncing on app launch
          this.setSubTitle(text, StyleKit.variables.stylekitWarningColor);
        }, 250);
      } else if(status.retrievedCount > 20) {
        var text = `Downloading ${status.retrievedCount} items. Keep app open.`
        this.setSubTitle(text);
        this.showingDownloadStatus = true;
      } else if(this.showingDownloadStatus) {
        this.showingDownloadStatus = false;
        var text = "Download Complete.";
        this.setSubTitle(text);
        setTimeout(() => {
          this.setSubTitle(null);
        }, 2000);
      } else if(this.showingErrorStatus) {
        this.setSubTitle(null);
      }
    })

    this.signoutObserver = Auth.get().addEventHandler((event) => {
      if(event == SFAuthManager.DidSignOutEvent) {
        this.setSubTitle(null);
        let notifyObservers = false;
        ApplicationState.getOptions().reset(notifyObservers);
        this.reloadOptionsToDefault();
        ApplicationState.getOptions().notifyObservers();

        if(this.shouldPresentSplash()) {
          this.presentSplash();
        }
      }
    });

    this.reloadOptionsToDefault();
  }

  reloadOptionsToDefault() {
    let options = ApplicationState.getOptions();
    if(options.selectedTagIds.length == 0) {
      // select default All notes smart tag
      options.setSelectedTagIds(ModelManager.get().defaultSmartTag().uuid);
    }
  }

  onUnlockPress = () => {
    let initialAppState = ApplicationState.Launching;
    let authProps = ApplicationState.get().getAuthenticationPropsForAppState(initialAppState);
    if(authProps.sources.length > 0) {
      this.presentAuthenticationModal(authProps);
    }
  }

  componentDidMount() {
    super.componentDidMount();

    if(this.authOnMount) {
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
    ApplicationState.get().removeEventHandler(this.applicationStateEventHandler);
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
    let encryptionEnabled = KeysManager.get().isOfflineEncryptionEnabled();
    this.setSubTitle(encryptionEnabled ? "Decrypting items..." : "Loading items...");
    let incrementalCallback = (current, total) => {
      let notesString = `${current}/${total} items...`
      this.setSubTitle(encryptionEnabled ? `Decrypting ${notesString}` : `Loading ${notesString}`);
      // Incremental Callback
      if(!this.dataLoaded) {
        this.dataLoaded = true;
      }
      this.notesRef && this.notesRef.root_onIncrementalSync();
    }

    let loadLocalCompletion = (items) => {
      this.setSubTitle("Syncing...");
      this.dataLoaded = true;

      // perform initial sync
      Sync.get().sync({performIntegrityCheck: true}).then(() => {
        this.setSubTitle(null);
      });
    }

    if(Sync.get().initialDataLoaded()) {
      // Data can be already loaded in the case of a theme change
      loadLocalCompletion();
    } else {
      let batchSize = 100;
      Sync.get().loadLocalItems({incrementalCallback, batchSize}).then((items) => {
        setTimeout(() => {
          loadLocalCompletion(items);
        });
      });
    }
  }

  presentAuthenticationModal(authProps) {
    if(!this.isMounted()) {
      console.log("Not yet mounted, not authing.");
      this.authOnMount = authProps;
      return;
    }


    if(this.authenticationInProgress) {
      console.log('Not presenting auth modal because one is already presented.');
      return;
    }

    this.authenticationInProgress = true;

    if(this.pendingAuthProps) {
      // Existing unvalidated auth props. Don't use input authProps.
      // This is to handle the case on Android where if a user has both fingerprint (immediate) and passcode (on quit),
      // they can press the physical back button on launch to dismiss auth window, then come back into app, and it will only ask for fingerprint.
      // We'll clear pendingAuthProps on success
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
        if(this.dataLoaded) {
          Sync.get().sync();
        }
      },
      onUnmount: () => {
        this.authenticationInProgress = false;
      }
    });
  }

  onNoteSelect = (note) => {
    this.composeRef.setNote(note);
    this.setState({selectedTagId: this.notesRef.options.selectedTagIds.length && this.notesRef.options.selectedTagIds[0]});
  }

  onLayout = (e) => {
    let width = e.nativeEvent.layout.width;
    /*
    If you're in tablet mode, but on an iPad where this app is running side by side by another app,
    we only want to show the Compose window and not the list, because there isn't enough space.
    */
    const MinWidthToSplit = 450;
    if(ApplicationState.get().isTabletDevice) {
      if(width < MinWidthToSplit) {
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
      keyboardHeight: ApplicationState.get().getKeyboardHeight()
    });
  }

  toggleNoteSideMenu = () => {
    if(!ApplicationState.get().isInTabletMode) {
      return;
    }

    ApplicationState.get().setNoteSideMenuCollapsed(!ApplicationState.get().isNoteSideMenuCollapsed)
  }

  render() {
    /* Don't render LockedView here since we need this.notesRef as soon as we can (for componentWillFocus callback) */

    let {shouldSplitLayout, notesListCollapsed} = this.state;

    let notesStyles = shouldSplitLayout ? [this.styles.left, {width: notesListCollapsed ? 0 : "40%"}] : [StyleKit.styles.container, {flex: 1}];
    let composeStyles = shouldSplitLayout ? [this.styles.right, {width: notesListCollapsed ? "100%" : "60%"}] : null;

    const collapseIconPrefix = StyleKit.platformIconPrefix();
    const iconNames = {
      md: ["arrow-dropright", "arrow-dropleft"],
      ios: ["arrow-forward", "arrow-back"]
    };
    let collapseIconName = collapseIconPrefix + "-" + iconNames[collapseIconPrefix][notesListCollapsed ? 0 : 1];
    let collapseIconBottomPosition = this.state.keyboardHeight > this.state.height / 2 ? this.state.keyboardHeight : "50%";

    return (
      <View onLayout={this.onLayout} style={[StyleKit.styles.container, this.styles.root]}>
        <View style={notesStyles}>
          <Notes
            ref={(ref) => {this.notesRef = ref}}
            onUnlockPress={this.onUnlockPress}
            navigation={this.props.navigation}
            onNoteSelect={shouldSplitLayout && this.onNoteSelect /* tablet only */}
          />
        </View>

        {shouldSplitLayout &&
          <View style={composeStyles}>
            <Compose
              ref={(ref) => {this.composeRef = ref}}
              selectedTagId={this.state.selectedTagId}
              navigation={this.props.navigation}
            />

            <TouchableHighlight
              underlayColor={StyleKit.variable("stylekitBackgroundColor")}
              style={[this.styles.toggleButtonContainer, this.styles.toggleButton, {bottom: collapseIconBottomPosition}]}
              onPress={this.toggleNoteSideMenu}>
              <View>
                <Icon name={collapseIconName} size={24} color={StyleKit.hexToRGBA(StyleKit.variables.stylekitInfoColor, 0.85)} />
              </View>
            </TouchableHighlight>
          </View>
        }
      </View>
    )
  }

  loadStyles() {
    this.styles = {
      root: {
        flex: 1,
        flexDirection: "row"
      },
      left: {
        borderRightColor: StyleKit.variables.stylekitBorderColor,
        borderRightWidth: 1
      },
      right: {

      },
      toggleButtonContainer: {
        backgroundColor: StyleKit.hexToRGBA(StyleKit.variables.stylekitContrastBackgroundColor, 0.5)
      },
      toggleButton: {
        justifyContent: "center",
        position: "absolute",
        left: 0,
        padding: 7,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
        marginTop: -12
      }
    }
  }

}

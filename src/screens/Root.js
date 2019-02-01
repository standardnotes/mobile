import React, { Component, Fragment } from 'react';
import { View } from 'react-native';
import StyleKit from "@Style/StyleKit"
import Sync from '@SFJS/syncManager'
import Auth from '@SFJS/authManager'
import KeysManager from '@Lib/keysManager'
import ModelManager from "@SFJS/modelManager"
import AlertManager from '@SFJS/alertManager'

import Abstract from "@Screens/Abstract"
import LockedView from "@Containers/LockedView";
import ApplicationState from "@Lib/ApplicationState"

import Compose from "@Screens/Compose"
import Notes from "@Screens/Notes/Notes"

export default class Root extends Abstract {

  constructor(props) {
    super(props);
    this.registerObservers();
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

    this.syncEventHandler = Sync.get().addEventHandler((event, data) => {
     if(event == "sync-session-invalid") {
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
    Sync.get().removeSyncStatusObserver(this.syncStatusObserver);
    clearInterval(this.syncTimer);
  }

  /* Forward React Navigation lifecycle events to notes */

  componentWillFocus() {
    super.componentWillFocus();
    this.notesRef && this.notesRef.componentWillFocus();
  }

  componentDidFocus() {
    super.componentDidFocus();
    this.notesRef && this.notesRef.componentDidFocus();
  }

  componentDidBlur() {
    super.componentDidBlur();
    this.notesRef && this.notesRef.componentDidBlur();
  }

  componentWillBlur() {
    super.componentWillBlur();
    this.notesRef && this.notesRef.componentWillBlur();
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
      Sync.get().sync().then(() => {
        this.setSubTitle(null);
      });
    }

    if(Sync.get().initialDataLoaded()) {
      // Data can be already loaded in the case of a theme change
      loadLocalCompletion();
    } else {
      let batchSize = 100;
      Sync.get().loadLocalItems(incrementalCallback, batchSize).then((items) => {
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

    this.props.navigation.navigate("Authenticate", {
      authenticationSources: authProps.sources,
      onSuccess: () => {
        authProps.onAuthenticate();
        this.authenticationInProgress = false;

        if(this.dataLoaded) {
          Sync.get().sync();
        }
      }
    });
  }

  onNoteSelect = (note) => {
    this.composer.setNote(note);
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
      shouldSplitLayout: ApplicationState.get().isInTabletMode
    });
  }

  render() {
    /* Don't render LockedView here since we need this.notesRef as soon as we can (for componentWillFocus callback) */

    let shouldSplitLayout = ApplicationState.get().isInTabletMode;

    let notesStyles = shouldSplitLayout ? [this.styles.left, {width: shouldSplitLayout ? "34%" : 0}] : [StyleKit.styles.container, {flex: 1}];
    let composeStyles = shouldSplitLayout ? [this.styles.right, {width: shouldSplitLayout ? "66%" : "100%"}] : null;

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
              ref={(ref) => {this.composer = ref}}
              selectedTagId={this.state.selectedTagId}
              navigation={this.props.navigation}
            />
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

      }
    }
  }

}

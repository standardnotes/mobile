import React, { Component } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, ScrollView, Text, Modal, AppState } from 'react-native';
import NoteCell from "@Screens/Notes/NoteCell"
import Search from 'react-native-search-box'
import StyleKit from "../style/StyleKit"
import Authenticate from "../screens/Authenticate"
import ApplicationState from "@Lib/ApplicationState"

/*

  Wednesday, Sept 12, 2018:
  There was an issue which could be best replicated in Android by either:
  1. Going into Developer settings, disabling background activities.
    Then open app with Fingperint on quit, close app, reopen, and you would see blank screen with just "Notes"
  2. Pressing r+r / cmr + r in dev mode with fingerprint on quit.

  This issue would result in blank screen, because this.state.visible would never be set to true, because
  the application states that would trigger an actual authentication were being propagted before the observer was registered.
  (i.e ApplicationStateLaunching).

  So, as part of one fix, when we register an observer, we now forward previous events.

  However, after received previous events like Launching, we would have quickly received other events like "Resuming".
  Launching would require passcode, but resuming wouldn't, so this.state.visible would be set to true, then quickly to set to false,
  never giving the chance for authentication to be visible.

  To fix this, when we set visible to true, we set the flag this.didSetVisibleToTrue = visible, and don't update the state again after that if this
  flag is true.

  Finally, because in the constructor we would access the most recent state, which would not always be an authentication state,
  the Authenticate componenet would be initialized with the first value of authProps, and never updated.
  So now we initialize with empty values, and in the render method, return empty if false (so we don't initialize unwanted Authenticate component).
*/

export default class AuthModal extends Component {

  constructor(props) {
    super(props);

    this.state = {
      authProps: {}
    };
  }

  componentWillUnmount() {
    ApplicationState.get().removeStateObserver(this.stateObserver);
  }

  componentDidMount() {
    this.mounted = true;

    this.stateObserver = ApplicationState.get().addStateObserver((state) => {
      if(!this.didSetVisibleToTrue && ApplicationState.get().isStateAppCycleChange(state)
        && !ApplicationState.get().isAuthenticationInProgress()) {
        let authProps = ApplicationState.get().getAuthenticationPropsForAppState(state);
        let visible = (authProps.passcode || authProps.fingerprint) || false;
        this.setState({
          authProps: authProps,
          applicationState: state,
          visible: visible
        }, () => {
          // setState is async, we want to wait for this callback before calling this.
          this.beginAuthIfNecessary();
        });
        this.didSetVisibleToTrue = visible;

        // After coming inside this part of the code, it means we're handling auth props as we needed.
        // We should now clear previous event history. Otherwise, if we go to the background and come back,
        // all events will be forwared again, like Launch event, meaning things set to On Quit will be prompted
        // when coming back from the background.
        ApplicationState.get().clearEventHistory();
      } else {
        // We want to set the applicationState here either way in case we don't make it inside the above if clause.
        // This way beginAuthIfNecessary has the correct most recent state, and can use that to make the best decision
        // as to whether it should begin auth.
        this.setState({applicationState: state});
        this.beginAuthIfNecessary();
      }
    });

    if(this.beginAuthOnMount) {
      this.beginAuthOnMount = false;
      this.beginAuth();
    }
  }

  beginAuthIfNecessary() {
    // Note that the comment below wasn't updated as part of the huge lock fix updates in 9/2018:

    // Once visible is true even once, we need to lock it in place,
    // and only make it in-visible after authentication completes.
    // This value is checked above in the application state observer to make sure we
    // don't accidentally change the value and dismiss this while its in view

    if(!ApplicationState.get().isAuthenticationInProgress()) {
      if(this.state.applicationState == ApplicationState.Launching || this.state.applicationState == ApplicationState.Resuming) {
        if(this.mounted && this.state.visible) {
          this.beginAuth();
        } else {
          this.beginAuthOnMount = true;
        }
      }
    }
  }

  beginAuth() {
    if(!this.state.visible) {
      console.error("Not supposed to call beginAuth before visible.");
    }

    try {
      this.refs.authenticate.beginAuthentication();
      ApplicationState.get().setAuthenticationInProgress(true);
    } catch (e) {
      console.error("Unable to begin auth", e);
    }
  }

  onAuthenticateSuccess = () => {
    // First hide Modal
    this.setState({visible: false});
    this.didSetVisibleToTrue = false;
    this.forceUpdate();

    // Wait for it to begin dismissing, then trigger callback. Otherwise, AuthModal can be deallocated before Modal is removed, causing problems.
    setTimeout(() => {
      this.state.authProps.onAuthenticate();
    }, 0);
  }

  render() {
    if(!this.state.visible) {
      return <View/>;
    }

    let authProps = this.state.authProps;
    return (
      <View style={[StyleKit.styles.container]}>
        <Modal
         animationType={"slide"}
         transparent={true}
         visible={this.state.visible}
         onRequestClose={() => {}}>

          <Authenticate
            ref={'authenticate'}
            title={authProps.title}
            onAuthenticateSuccess={this.onAuthenticateSuccess}
            mode={"authenticate"}
            requirePasscode={authProps.passcode}
            requireFingerprint={authProps.fingerprint}
            pseudoModal={true}
            authProps={authProps}
          />
        </Modal>
      </View>
    )
  }

}

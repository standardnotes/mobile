import React, { Component } from 'react';
import { TextInput, View, Text, Alert, Button, ScrollView } from 'react-native';

import Abstract from "@Screens/Abstract"
import SectionHeader from "@Components/SectionHeader";
import ButtonCell from "@Components/ButtonCell";
import TableSection from "@Components/TableSection";
import SectionedTableCell from "@Components/SectionedTableCell";
import SectionedAccessoryTableCell from "@Components/SectionedAccessoryTableCell";
import SectionedOptionsTableCell from "@Components/SectionedOptionsTableCell";
import StyleKit from "@Style/StyleKit"
import Icon from 'react-native-vector-icons/Ionicons';
import ApplicationState from "@Lib/ApplicationState"

export default class Authenticate extends Abstract {

  static navigationOptions = ({ navigation, navigationOptions }) => {
    let templateOptions = {
      // On Android, not having a left button will make the title appear all the way at the edge
      // Below will add some padding
      title: ApplicationState.isAndroid ? "  Authenticate" : "Authenticate"
    }
    return Abstract.getDefaultNavigationOptions({navigation, navigationOptions, templateOptions});
  };

  constructor(props) {
    super(props);

    for(let source of this.sources) {
      source.onRequiresInterfaceReload = () => {
        this.forceUpdate();
      }
      source.initializeForInterface();
    }

    this.stateObserver = ApplicationState.get().addStateObserver((state) => {
      if(state == ApplicationState.GainingFocus) {
        if(!this.state.activeSource) {
          this.begin();
        }
      } else if(state == ApplicationState.Backgrounding) {
        this.cancel();
      }
    })

    this._sessionLength = this.getProp("selectedSessionLength");

    if(this.getProp("hasCancelOption")) {
      props.navigation.setParams({
        leftButton: {
          title: ApplicationState.isIOS ? "Cancel" : null,
          iconName: ApplicationState.isIOS ? null : StyleKit.nameForIcon("close"),
          onPress: () => {
            this.getProp("onCancel")();
            this.dismiss();
          }
        }
      })
    }

    this.pendingSources = this.sources.slice();
    this.successfulSources = [];
  }

  componentWillUnmount() {

    // Typically there should be no way to exit this window if it doesn't have a cancel option.
    // However, on Android, you can press the hardware back button to dismiss it. We want to notify
    // caller that this screen has unmounted
    let onUnmount = this.getProp("onUnmount");
    if(onUnmount) {
      onUnmount();
    }

    super.componentWillUnmount();
    ApplicationState.get().removeStateObserver(this.stateObserver);
  }

  submitPressed() {
    // If we just pressed submit on the only pending source left, disable submit button
    if(this.pendingSources.length == 1) {
      this.setState({submitDisabled: true});
    }

    if(this.state.activeSource) {
      this.validateAuthentication(this.state.activeSource);
    }
  }

  componentWillFocus() {
    super.componentWillFocus();

    if(ApplicationState.get().getMostRecentState() !== ApplicationState.LosingFocus) {
      this.begin();
    }
  }

  cancel() {
    if(this.state.activeSource) {
      this.state.activeSource.cancel();
      this.setState({activeSource: null});
    }
  }

  begin() {
    this.beginNextAuthentication();
  }

  get sources() {
    return this.getProp("authenticationSources");
  }

  beginNextAuthentication() {
    if(this.pendingSources && this.pendingSources.length) {
      let firstSource = this.pendingSources[0];
      this.beginAuthenticationForSource(firstSource);
    }
  }

  async beginAuthenticationForSource(source) {
    // Authentication modal may be displayed on lose focus just before the app is closing.
    // In this state however, we don't want to begin auth. We'll wait until the app gains focus.
    let isLosingFocus = ApplicationState.get().getMostRecentState() == ApplicationState.LosingFocus;

    if(source.type == "biometric" && !isLosingFocus) {
      // Begin authentication right away, we're not waiting for any input
      this.validateAuthentication(source);
    } else if(source.type == "input") {
      if(source.inputRef) {
        source.inputRef.focus();
      }
    }

    source.setWaitingForInput();
    this.setState({activeSource: source});
    this.forceUpdate();
  }

  successfulSourcesIncludesSource(source) {
    for(let candidate of this.successfulSources) {
      if(candidate.identifier == source.identifier) {
        return true;
      }
    }

    return false;
  }

  isAllSourcesSuccessful() {
    for(let source of this.sources) {
      if(this.successfulSourcesIncludesSource(source) == false) {
        return false;
      }
    }

    return true;
  }

  async validateAuthentication(source) {
    // Don't double validate, otherwise the comparison of successfulSources.length will be misleading.
    let alreadySuccessful = this.successfulSourcesIncludesSource(source);
    if(alreadySuccessful || source.isAuthenticating()) {
      return;
    }

    // Disable submit while we're processing. Will be re-enabled below.
    this.setState({submitDisabled: true});

    let result = await source.authenticate();
    if(source.isInSuccessState()) {
      this.successfulSources.push(source);
      _.pull(this.pendingSources, source);
      this.forceUpdate();
    } else {
      if(result.error && result.error.message) {
        Alert.alert("Unsuccessful", result.error.message);
      }
    }

    if(this.isAllSourcesSuccessful()) {
      this.onSuccess();
    } else {
      this.setState({submitDisabled: false});
      if(!result.error) {
        this.beginNextAuthentication();
      }
    }
  }

  async onBiometricDirectPress(source) {
    // Validate current auth if set. Validating will also handle going to next
    if(this.state.activeSource && this.state.activeSource != source) {
      this.validateAuthentication(this.state.activeSource);
    } else {
      this.beginAuthenticationForSource(source);
    }
  }

  onSuccess() {
    // Wait for componentWillBlur/componentDidlBlur to call onSuccess callback.
    // This way, if the callback has another route change, the dismissal
    // of this one won't affect it.
    this.needsSuccessCallback = true;
    this.dismiss();
  }

  componentWillBlur() {
    super.componentWillBlur();
    if(this.needsSuccessCallback) {
      this.triggerSuccessCallback();
    }
  }

  /*
    On Android, when pressing physical back then re-opening app and authenticating and closing modal,
    componentWillBlur is not called for some reason. componentDidBlur is called however, albiet ~2 seconds later.
    Note however that this only seems to happen on the emulator, and not on physical device.
   */
  componentDidBlur() {
    super.componentDidBlur();
    if(this.needsSuccessCallback) {
      this.triggerSuccessCallback();
    }
  }

  triggerSuccessCallback() {
    this.getProp("onSuccess")(this._sessionLength);
    this.needsSuccessCallback = false;
  }

  inputTextChanged(text, source) {
    source.setAuthenticationValue(text);
    this.forceUpdate();
  }

  get sessionLengthOptions() {
    return this.getProp("sessionLengthOptions");
  }

  setSessionLength(length) {
    this._sessionLength = length;
    this.forceUpdate();
  }

  _renderAuthenticationSoure = (source, index) => {

    let isLast = index == this.sources.length - 1;

    const inputAuthenticationSource = (source) => (
      <View style={[this.styles.authSourceSection, !isLast ? this.styles.authSourceSectionNotLast : undefined]}>
        <SectionedTableCell textInputCell={true} first={true} onPress={() => {}}>
          <TextInput
            ref={(ref) => {source.inputRef = ref}}
            style={StyleKit.styles.sectionedTableCellTextInput}
            placeholder={source.inputPlaceholder}
            onChangeText={(text) => {this.inputTextChanged(text, source)}}
            value={source.getAuthenticationValue()}
            autoCorrect={false}
            autoFocus={false}
            autoCapitalize={'none'}
            secureTextEntry={true}
            keyboardType={source.keyboardType || "default"}
            keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
            underlineColorAndroid={'transparent'}
            placeholderTextColor={StyleKit.variables.stylekitNeutralColor}
            onSubmitEditing={() => {this.validateAuthentication(source)}}
          />
        </SectionedTableCell>
      </View>
    )

    const biometricAuthenticationSource = (source) => (
      <View style={[this.styles.authSourceSection, !isLast ? this.styles.authSourceSectionNotLast : undefined]}>
        <SectionedAccessoryTableCell
          first={true}
          dimmed={source != this.state.activeSource}
          tinted={source == this.state.activeSource}
          text={source.label}
          onPress={() => {this.onBiometricDirectPress(source)}}
        >
        </SectionedAccessoryTableCell>
      </View>
    )

    let hasHeaderSubtitle = source.type == "input";

    return (
      <View key={source.identifier}>
        <SectionHeader
          title={source.title + (source.status == "waiting-turn" ? " — Waiting" : "")}
          subtitle={hasHeaderSubtitle && source.label}
          tinted={source == this.state.activeSource}
        />
        {source.type == "input" &&
          inputAuthenticationSource(source)
        }
        {source.type == "biometric" &&
          biometricAuthenticationSource(source)
        }
      </View>
    )
  }

  render() {
    return (
      <View style={StyleKit.styles.container}>
        <ScrollView style={{backgroundColor: StyleKit.variables.stylekitBackgroundColor}} keyboardShouldPersistTaps={'always'} keyboardDismissMode={'interactive'}>
          {this.sources.map((source, index) => {
            return this._renderAuthenticationSoure(source, index)
          })}

          <ButtonCell
            style={this.styles.submitButtonCell}
            maxHeight={45}
            disabled={this.state.submitDisabled}
            title={this.pendingSources.length > 1 ? "Next" : "Submit"}
            bold={true}
            onPress={() => this.submitPressed()}
          />

          {this.sessionLengthOptions && this.sessionLengthOptions.length > 0 &&
            <View style={this.styles.rememberForSection}>
              <SectionHeader title={"Remember For"} />
              {this.sessionLengthOptions.map((option, index) =>
                <SectionedAccessoryTableCell
                  text={option.label}
                  key={`${index}`}
                  first={index == 0}
                  last={index == this.sessionLengthOptions.length - 1}
                  selected={() => {return option.value == this._sessionLength}}
                  onPress={() => {this.setSessionLength(option.value)}}
                />
              )}
            </View>
          }

        </ScrollView>
      </View>
    )
  }

  loadStyles() {
    this.styles = {
      authSourceSectionNotLast: {
        marginBottom: 10
      },
      rememberForSection: {
        marginTop: 10
      }
    }
  }

}

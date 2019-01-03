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

// Dev mode only. Used to destroy data
// import KeysManager from "@Lib/keysManager";
// import Auth from "@SFJS/authManager"

export default class Authenticate extends Abstract {

  static navigationOptions = ({ navigation, navigationOptions }) => {
    let templateOptions = {
      title: "Authenticate",
      rightButton: {
        title: "Submit",
      }
    }
    return Abstract.getDefaultNavigationOptions({navigation, navigationOptions, templateOptions});
  };

  constructor(props) {
    super(props);

    for(let source of this.sources) {
      source.onRequiresInterfaceReload = () => {
        this.forceUpdate();
      }
    }

    // if(__DEV__) {
      // props.navigation.setParams({
      //   leftButton: {
      //     title: "Destroy Data",
      //     onPress: () => {
      //       Auth.get().signout();
      //       KeysManager.get().clearOfflineKeysAndData(true);
      //     }
      //   }
      // })
    // }

    if(this.getProp("hasCancelOption")) {
      props.navigation.setParams({
        leftButton: {
          title: "Cancel",
          onPress: () => {
            this.getProp("onCancel")();
            this.dismiss();
          }
        }
      })
    }

    this.pendingSources = this.sources.slice();
    this.successfulSources = [];
    this.updateHeaderBar();
  }

  updateHeaderBar() {
    if(this.pendingSources.length > 1) {
      buttonText = "Next";
    } else {
      buttonText = "Submit";
    }

    this.props.navigation.setParams({
      rightButton: {
        title: buttonText,
        onPress: () => {
          if(this.state.activeSource) {
            this.validateAuthentication(this.state.activeSource);
          }
        }
      }
    })
  }

  componentDidMount() {
    this.beginNextAuthentication();
  }

  get sources() {
    return this.getProp("authenticationSources");
  }

  beginNextAuthentication() {
    let firstSource = this.pendingSources[0];
    this.beginAuthenticationForSource(firstSource);
  }

  async beginAuthenticationForSource(source) {
    if(source.type == "biometric") {
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

  async validateAuthentication(source) {
    let result = await source.authenticate();
    if(source.isInSuccessState()) {
      this.successfulSources.push(source);
      _.remove(this.pendingSources, source);
      this.updateHeaderBar();
    } else {
      if(result.error && result.error.message) {
        Alert.alert("Unsuccessful", result.error.message);
      }
    }

    if(this.successfulSources.length == this.sources.length) {
      this.onSuccess();
    } else {
      this.beginNextAuthentication();
    }
  }

  onSuccess() {
    // Wait for componentWillBlur to call onSuccess callback.
    // This way, if the callback has another route change, the dismissal
    // of this one won't affect it.
    this.successful = true;
    this.dismiss();
  }

  componentWillBlur() {
    super.componentWillBlur();
    if(this.successful) {
      this.getProp("onSuccess")();
    }
  }

  inputTextChanged(text, source) {
    source.setAuthenticationValue(text);
    this.forceUpdate();
  }

  _renderAuthenticationSoure = (source) => {

    const inputAuthenticationSource = (source) => (
      <View style={{marginBottom: 10}}>
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
            underlineColorAndroid={'transparent'}
            placeholderTextColor={StyleKit.variables.stylekitNeutralColor}
            onSubmitEditing={() => {this.validateAuthentication(source)}}
          />
        </SectionedTableCell>
      </View>
    )

    const biometricAuthenticationSource = (source) => (
      <View style={{marginBottom: 10}}>
        <SectionedAccessoryTableCell
          first={true}
          dimmed={true}
          text={source.label}
          onPress={() => {this.beginAuthenticationForSource(source)}}
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
          {this.sources.map((source) => {
            return this._renderAuthenticationSoure(source)
          })}
        </ScrollView>
      </View>
    )
  }

}

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
import KeysManager from "@Lib/keysManager";

export default class Authenticate extends Abstract {

  static navigationOptions = ({ navigation, navigationOptions }) => {
    let templateOptions = {
      title: "Authentication Required",
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

    if(__DEV__) {
      props.navigation.setParams({
        rightButton: {
          title: "Clear",
          onPress: () => {
            KeysManager.get().clearAccountKeysAndData();
            KeysManager.get().clearOfflineKeysAndData();
          }
        }
      })
    }

    this.pendingSources = this.sources.slice();
    this.successfulSources = [];
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
    this.setState({activeSource: source});
    this.forceUpdate();
  }

  async validateAuthentication(source) {
    let result = await source.authenticate();
    if(source.isInSuccessState()) {
      this.successfulSources.push(source);
      _.remove(this.pendingSources, source);
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
    this.getProp("onSuccess")();
    this.dismiss();
  }

  inputTextChanged(text, source) {
    source.setAuthenticationValue(text);
    this.forceUpdate();
  }

  _renderAuthenticationSoure = (source) => {

    const inputAuthenticationSource = (source) => (
      <View>
        <SectionHeader title={source.title} subtitle={source.label} tinted={source == this.state.activeSource} />
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
      <View>
        <SectionHeader title={source.title} tinted={source == this.state.activeSource} />
        <SectionedAccessoryTableCell first={true} text={source.label} onPress={() => {}}>
        </SectionedAccessoryTableCell>
      </View>
    )

    return (
      <View key={source.identifier}>
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

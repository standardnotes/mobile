import React, { Component } from 'react';
import {TextInput, View, Text} from 'react-native';
import GlobalStyles from "../../Styles"

import SectionHeader from "../../components/SectionHeader";
import ButtonCell from "../../components/ButtonCell";
import TableSection from "../../components/TableSection";
import SectionedTableCell from "../../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../../components/SectionedAccessoryTableCell";
import AbstractComponent from "../../components/AbstractComponent"

const DEFAULT_SIGN_IN_TEXT = "Sign In";
const DEFAULT_REGISTER_TEXT = "Register";

export default class AuthSection extends AbstractComponent {
  constructor(props) {
    super(props);
    this.state = _.merge(props.params, {
      signingIn: false,
      registering: false,
      strictSignIn: false,
      signInButtonText: DEFAULT_SIGN_IN_TEXT,
      registerButtonText: DEFAULT_REGISTER_TEXT
    });
  }

  showAdvanced = () => {
    this.mergeState({showAdvanced: true});
  }

  onSignInPress = () => {
    this.mergeState({signingIn: true, signInButtonText: "Generating Keys..."});
    this.props.onSignInPress(this.state, (success) => {
      if(!success) {
        this.mergeState({signingIn: false, signInButtonText: DEFAULT_SIGN_IN_TEXT});
      }
    })
  }

  onRegisterPress = () => {
    this.mergeState({registering: true, registerButtonText: "Generating Keys..."});
    this.props.onRegisterPress(this.state, (success) => {
      if(!success) {
        this.mergeState({registering: false, registerButtonText: DEFAULT_REGISTER_TEXT});
      }
    })
  }

  toggleStrictMode = () => {
    this.setState((prevState) => {
      return {strictSignIn: !prevState.strictSignIn};
    })
  }

  render() {
    let textPadding = GlobalStyles.constants().paddingLeft;
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        {!this.props.mfa &&
          <View>
            <SectionedTableCell textInputCell={true} first={true}>
              <TextInput
                style={GlobalStyles.styles().sectionedTableCellTextInput}
                placeholder={"Email"}
                onChangeText={(text) => this.setState({email: text})}
                value={this.state.email}
                autoCorrect={false}
                autoCapitalize={'none'}
                keyboardType={'email-address'}
                underlineColorAndroid={'transparent'}
                placeholderTextColor={GlobalStyles.constants().mainDimColor}
              />
            </SectionedTableCell>

            <SectionedTableCell textInputCell={true}>
              <TextInput
                style={GlobalStyles.styles().sectionedTableCellTextInput}
                placeholder={"Password"}
                onChangeText={(text) => this.setState({password: text})}
                value={this.state.password}
                secureTextEntry={true}
                underlineColorAndroid={'transparent'}
                placeholderTextColor={GlobalStyles.constants().mainDimColor}
              />
            </SectionedTableCell>
          </View>
        }

        {this.props.mfa &&
          <View>
            <Text style={[GlobalStyles.styles().uiText, {paddingLeft: textPadding, paddingRight: textPadding, marginBottom: textPadding}]}>
              {this.props.mfa.message}
            </Text>
            <SectionedTableCell textInputCell={true} first={true}>
              <TextInput
                style={GlobalStyles.styles().sectionedTableCellTextInput}
                placeholder=""
                onChangeText={(text) => this.setState({mfa_token: text})}
                value={this.state.mfa_token}
                keyboardType={'numeric'}
                autoFocus={true}
                underlineColorAndroid={'transparent'}
                placeholderTextColor={GlobalStyles.constants().mainDimColor}
                onSubmitEditing={this.onSignInPress}
              />
            </SectionedTableCell>
          </View>
        }

        {(this.state.showAdvanced || !this.state.server) && !this.props.mfa &&
          <View>
            <SectionHeader title={"Advanced"} />
            <SectionedTableCell textInputCell={true} first={true}>
              <TextInput
                style={GlobalStyles.styles().sectionedTableCellTextInput}
                placeholder={"Sync Server"}
                onChangeText={(text) => this.setState({server: text})}
                value={this.state.server}
                autoCorrect={false}
                autoCapitalize={'none'}
                keyboardType={'url'}
                underlineColorAndroid={'transparent'}
                placeholderTextColor={GlobalStyles.constants().mainDimColor}
              />
            </SectionedTableCell>

            <SectionedAccessoryTableCell
              onPress={() => this.toggleStrictMode()}
              text={"Use strict sign in"}
              selected={() => {return this.state.strictSignIn}}
              first={false}
              last={true}
            />
          </View>
        }

        <ButtonCell title={this.state.signInButtonText} disabled={this.state.signingIn} bold={true} onPress={() => this.onSignInPress()} />

        {!this.props.mfa &&
          <ButtonCell last={this.state.showAdvanced} title={this.state.registerButtonText} disabled={this.state.registering} bold={true} onPress={() => this.onRegisterPress()} />
        }

        {!this.state.showAdvanced && !this.props.mfa &&
          <ButtonCell last={true} title="Advanced Options" onPress={() => this.showAdvanced()} />
        }


      </TableSection>
    );
  }
}

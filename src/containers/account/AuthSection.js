import React, { Component } from 'react';
import {TextInput, View} from 'react-native';
import GlobalStyles from "../../Styles"

import SectionHeader from "../../components/SectionHeader";
import ButtonCell from "../../components/ButtonCell";
import TableSection from "../../components/TableSection";
import SectionedTableCell from "../../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../../components/SectionedAccessoryTableCell";
import AbstractComponent from "../../components/AbstractComponent"

var _ = require('lodash')

const DEFAULT_SIGN_IN_TEXT = "Sign In";
const DEFAULT_REGISTER_TEXT = "Register";

export default class AuthSection extends AbstractComponent {
  constructor(props) {
    super(props);
    this.state = _.merge(props.params, {
      signingIn: false,
      registering: false,
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

  render() {
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

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

        {(this.state.showAdvanced || !this.state.server) &&
          <SectionedTableCell textInputCell={true}>
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
        }

        <ButtonCell title={this.state.signInButtonText} disabled={this.state.signingIn} bold={true} onPress={() => this.onSignInPress()} />

        <ButtonCell title={this.state.registerButtonText} disabled={this.state.registering} bold={true} onPress={() => this.onRegisterPress()} />

        {!this.state.showAdvanced &&
          <ButtonCell title="Advanced Options" onPress={() => this.showAdvanced()} />
        }


      </TableSection>
    );
  }
}

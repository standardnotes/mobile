import React, { Component } from 'react';
import {TextInput, View, Text} from 'react-native';
import StyleKit from "@Style/StyleKit"

import SectionHeader from "@Components/SectionHeader";
import ButtonCell from "@Components/ButtonCell";
import TableSection from "@Components/TableSection";
import SectionedTableCell from "@Components/SectionedTableCell";
import SectionedAccessoryTableCell from "@Components/SectionedAccessoryTableCell";

const DEFAULT_SIGN_IN_TEXT = "Sign In";
const DEFAULT_REGISTER_TEXT = "Register";

export default class AuthSection extends Component {
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
    this.setState({showAdvanced: true});
  }

  onSignInPress = () => {
    this.setState({signingIn: true, signInButtonText: "Generating Keys..."});
    this.props.onSignInPress(this.state, (success) => {
      if(!success) {
        this.setState({signingIn: false, signInButtonText: DEFAULT_SIGN_IN_TEXT});
      }
    })
  }

  onRegisterPress = () => {
    this.setState({registering: true, registerButtonText: "Generating Keys..."});
    this.props.onRegisterPress(this.state, (success) => {
      if(!success) {
        this.setState({registering: false, registerButtonText: DEFAULT_REGISTER_TEXT});
      }
    })
  }

  toggleStrictMode = () => {
    this.setState((prevState) => {
      return {strictSignIn: !prevState.strictSignIn};
    })
  }

  render() {
    let textPadding = 14;
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        {!this.props.mfa &&
          <View>
            <SectionedTableCell textInputCell={true} first={true}>
              <TextInput
                style={StyleKit.styles.sectionedTableCellTextInput}
                placeholder={"Email"}
                onChangeText={(text) => this.setState({email: text})}
                value={this.state.email}
                autoCorrect={false}
                autoCapitalize={'none'}
                keyboardType={'email-address'}
                keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
                underlineColorAndroid={'transparent'}
                placeholderTextColor={StyleKit.variable("stylekitNeutralColor")}
              />
            </SectionedTableCell>

            <SectionedTableCell textInputCell={true}>
              <TextInput
                style={StyleKit.styles.sectionedTableCellTextInput}
                placeholder={"Password"}
                onChangeText={(text) => this.setState({password: text})}
                value={this.state.password}
                secureTextEntry={true}
                keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
                underlineColorAndroid={'transparent'}
                placeholderTextColor={StyleKit.variable("stylekitNeutralColor")}
              />
            </SectionedTableCell>
          </View>
        }

        {this.props.mfa &&
          <View>
            <Text style={[StyleKit.styles.uiText, {paddingLeft: textPadding, paddingRight: textPadding, marginBottom: textPadding}]}>
              {this.props.mfa.message}
            </Text>
            <SectionedTableCell textInputCell={true} first={true}>
              <TextInput
                style={StyleKit.styles.sectionedTableCellTextInput}
                placeholder=""
                onChangeText={(text) => this.setState({mfa_token: text})}
                value={this.state.mfa_token}
                keyboardType={'numeric'}
                keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
                autoFocus={true}
                underlineColorAndroid={'transparent'}
                placeholderTextColor={StyleKit.variable("stylekitNeutralColor")}
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
                style={StyleKit.styles.sectionedTableCellTextInput}
                placeholder={"Sync Server"}
                onChangeText={(text) => this.setState({server: text})}
                value={this.state.server}
                autoCorrect={false}
                autoCapitalize={'none'}
                keyboardType={'url'}
                keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
                underlineColorAndroid={'transparent'}
                placeholderTextColor={StyleKit.variable("stylekitNeutralColor")}
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

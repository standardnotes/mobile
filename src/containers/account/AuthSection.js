import React, { Component } from 'react';
import {TextInput, View} from 'react-native';
import GlobalStyles from "../../Styles"

import SectionHeader from "../../components/SectionHeader";
import ButtonCell from "../../components/ButtonCell";
import TableSection from "../../components/TableSection";
import SectionedTableCell from "../../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../../components/SectionedAccessoryTableCell";

var _ = require('lodash')

export default class AuthSection extends Component {
  constructor(props) {
    super(props);
    this.state = _.merge(props.params, {signingIn: false});
  }

  showAdvanced = () => {
    this.setState(function(prevState){
      return _.merge(prevState, {showAdvanced: true});
    })
  }

  onSignInPress() {
    this.setState(function(prevState){
      return _.merge(prevState, {signingIn: true});
    })

    this.props.onSignInPress(this.state, function(){
      this.setState(function(prevState){
        return _.merge(prevState, {signingIn: false});
      })
    }.bind(this))
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

        {this.state.showAdvanced &&
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

        <SectionedTableCell buttonCell={true}>
          <ButtonCell disabled={this.state.signingIn} title={this.state.signingIn ? "Signing in..." : "Sign In"} bold={true} onPress={() => this.onSignInPress()} />
        </SectionedTableCell>

        <SectionedTableCell buttonCell={true}>
          <ButtonCell title="Register" bold={true}  onPress={() => this.props.onRegisterPress(this.state)} />
        </SectionedTableCell>

        {!this.state.showAdvanced &&
          <SectionedTableCell buttonCell={true}>
            <ButtonCell title="Advanced Options" onPress={() => this.showAdvanced()} />
          </SectionedTableCell>
        }


      </TableSection>
    );
  }
}

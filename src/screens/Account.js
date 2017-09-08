import React, { Component } from 'react';
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import ModelManager from '../lib/modelManager'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";

import GlobalStyles from "../Styles"

import {
  TextInput,
  SectionList,
  ScrollView,
  View
} from 'react-native';

export default class Account extends Component {

  constructor(props) {
    super(props);
    this.state = {};
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
  }

  onNavigatorEvent(event) {
    // console.log("Navigator event", event);
    switch(event.id) {
      case 'willAppear':
       this.forceUpdate();
       break;
      case 'didAppear':
        break;
      case 'willDisappear':
        break;
      case 'didDisappear':
        break;
      }
  }

  onSignInPress = (email, password) => {
    console.log("SIgn in press", email, password);

    var root = this;

    Auth.getInstance().login(email, password, "http://localhost:3000", function(user, error) {
      if(error) {
        Alert.alert(
          'Oops', error.message, [{text: 'OK', onPress: () => console.log('OK Pressed')},]
        )
        return;
      }

      console.log("Logged in user: ", user);

      Sync.getInstance().sync(function(response){
        console.log("Sync response:", response);
        root.forceUpdate();
      });
    })
  }

  onRegisterPress(email, password) {

  }

  onSignOutPress = () => {
    Auth.getInstance().signout(() => {
      console.log("Signed out");
      this.forceUpdate();
    })
  }

  onExportPress() {

  }

  render() {
    let signedIn = !Auth.getInstance().offline();
    return (
      <View style={GlobalStyles.rules.container}>
        <ScrollView>

          {!signedIn &&
            <AuthSection title={"Account"} onSignInPress={this.onSignInPress} onRegisterPress={this.onRegisterPress} />
          }

          <OptionsSection signedIn={signedIn} title={"Options"} onSignOutPress={this.onSignOutPress} onExportPress={this.onExportPress} />

        </ScrollView>
      </View>
    );
  }
}

class AuthSection extends Component {
  constructor(props) {
    super(props);
    this.state = {email: "a@bitar.io", password: "password"};
  }

  render() {
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        <SectionedTableCell textInputCell={true} first={true}>
          <TextInput
            style={GlobalStyles.rules.sectionedTableCellTextInput}
            placeholder={"Email"}
            onChangeText={(text) => this.setState({email: text})}
            value={this.state.email}
            autoCorrect={false}
            autoCapitalize={'none'}
            keyboardType={'email-address'}
          />
        </SectionedTableCell>

        <SectionedTableCell textInputCell={true}>
          <TextInput
            style={GlobalStyles.rules.sectionedTableCellTextInput}
            placeholder={"Password"}
            onChangeText={(text) => this.setState({password: text})}
            value={this.state.password}
            secureTextEntry={true}
          />
        </SectionedTableCell>

        <SectionedTableCell buttonCell={true}>
          <ButtonCell title="Sign In" bold={true} onPress={() => this.props.onSignInPress(this.state.email, this.state.password)} />
        </SectionedTableCell>

        <SectionedTableCell buttonCell={true}>
          <ButtonCell title="Register" bold={true}  onPress={this.props.onRegisterPress} />
        </SectionedTableCell>

        <SectionedTableCell buttonCell={true}>
          <ButtonCell title="Advanced Options" onPress={this.props.onRegisterPress} />
        </SectionedTableCell>

      </TableSection>
    );
  }
}

class OptionsSection extends Component {
  render() {
    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        {this.props.signedIn &&
          <SectionedTableCell buttonCell={true} first={true}>
            <ButtonCell leftAligned={true} title="Sign Out" onPress={this.props.onSignOutPress} />
          </SectionedTableCell>
        }

        <SectionedTableCell buttonCell={true} first={!this.props.signedIn}>
          <ButtonCell leftAligned={true} title="Export Data" onPress={this.props.onExportPress} />
        </SectionedTableCell>

      </TableSection>
    );
  }
}

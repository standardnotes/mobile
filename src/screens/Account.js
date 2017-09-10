import React, { Component } from 'react';
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import ModelManager from '../lib/modelManager'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";
import Abstract from "./Abstract"
var _ = require('lodash')

import GlobalStyles from "../Styles"

import {
  TextInput,
  SectionList,
  ScrollView,
  View,
  Alert
} from 'react-native';

export default class Account extends Abstract {

  constructor(props) {
    super(props);
    this.state = {params: {email: "a@bitar.io", password: "password"}};
  }

  componentDidMount() {
    Auth.getInstance().serverUrl().then(function(server){
      this.setState(function(prevState) {
        var params = prevState.params;
        params.server = server;
        return _.merge(prevState, {params: params});
      })
    }.bind(this))
  }

  onNavigatorEvent(event) {
    super.onNavigatorEvent(event);

    switch(event.id) {
      case 'willAppear':
       this.forceUpdate();
       break;
      }
  }

  onSignInPress = (params) => {
    var email = params.email;
    var password = params.password;

    if(!email) {
      Alert.alert('Missing Email', "Please enter a valid email address.", [{text: 'OK', onPress: () => console.log('OK Pressed')}])
      return;
    }

    if(!password) {
      Alert.alert('Missing Password', "Please enter your password.", [{text: 'OK', onPress: () => console.log('OK Pressed')}])
      return;
    }

    Auth.getInstance().login(email, password, params.server, function(user, error) {
      if(error) {
        Alert.alert(
          'Oops', error.message, [{text: 'OK', onPress: () => console.log('OK Pressed')},]
        )
        return;
      }

      console.log("Logged in user: ", user);

      this.onAuthSuccess();

    }.bind(this));
  }

  onAuthSuccess = () => {
    Sync.getInstance().markAllItemsDirtyAndSaveOffline();
    Sync.getInstance().sync(function(response){
      console.log("Sync response:", response);
      this.forceUpdate();
    }.bind(this));
  }

  onRegisterPress = (params) => {
    var email = params.email;
    var password = params.password;
  }

  onSignOutPress = () => {
    Auth.getInstance().signout(() => {
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
            <AuthSection params={this.state.params} title={"Account"} onSignInPress={this.onSignInPress} onRegisterPress={this.onRegisterPress} />
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
    this.state = props.params;
  }

  showAdvanced = () => {
    this.setState(function(prevState){
      return _.merge(prevState, {showAdvanced: true});
    })
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

        {this.state.showAdvanced &&
          <SectionedTableCell textInputCell={true}>
            <TextInput
              style={GlobalStyles.rules.sectionedTableCellTextInput}
              placeholder={"Sync Server"}
              onChangeText={(text) => this.setState({server: text})}
              value={this.state.server}
              autoCorrect={false}
              autoCapitalize={'none'}
              keyboardType={'url'}
            />
          </SectionedTableCell>
        }

        <SectionedTableCell buttonCell={true}>
          <ButtonCell title="Sign In" bold={true} onPress={() => this.props.onSignInPress(this.state)} />
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

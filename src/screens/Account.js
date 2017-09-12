import React, { Component } from 'react';
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import AlertManager from '../lib/alertManager'
import ModelManager from '../lib/modelManager'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";
import Abstract from "./Abstract"
import {Authenticate, AuthenticationState} from "./Authenticate"
var _ = require('lodash')

import GlobalStyles from "../Styles"

import {
  TextInput,
  SectionList,
  ScrollView,
  View,
  Alert,
  Keyboard
} from 'react-native';

export default class Account extends Abstract {

  constructor(props) {
    super(props);
    this.state = {params: {email: "a@bitar.io", password: "password"}};
  }

  loadPasscodeStatus() {
    var hasPasscode = AuthenticationState.get().hasPasscode()
    this.setState(function(prevState){
      return _.merge(prevState, {hasPasscode: hasPasscode});
    })
  }

  componentDidMount() {
    this.loadPasscodeStatus();
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
       this.loadPasscodeStatus();
       this.forceUpdate();
       break;
      }
  }

  onSignInPress = (params, callback) => {
    Keyboard.dismiss();

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
        callback();
        return;
      }

      console.log("Logged in user: ", user);

      this.onAuthSuccess();
      callback();
    }.bind(this));
  }

  onAuthSuccess = () => {
    Sync.getInstance().markAllItemsDirtyAndSaveOffline();
    Sync.getInstance().sync(function(response){
      this.forceUpdate();
    }.bind(this));
  }

  onRegisterPress = (params) => {
    Keyboard.dismiss();
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

  onThemeSelect = (theme) => {
    GlobalStyles.get().activateTheme(theme);
  }

  onThemeLongPress = (theme) => {
    AlertManager.showConfirmationAlert(
      "Redownload Theme", "Themes are cached when downloaded. To retrieve the latest version, press Redownload.", "Redownload",
      function(){
        GlobalStyles.get().downloadThemeAndReload(theme);
      }.bind(this)
    )
  }

  onPasscodeEnable = () => {
    this.props.navigator.showModal({
      screen: 'sn.Authenticate',
      title: 'Setup Passcode',
      animationType: 'slide-up',
      passProps: {
        mode: "setup",
        onSetupSuccess: () => {}
      }
    });
  }

  onPasscodeDisable = () => {
    AlertManager.showConfirmationAlert(
      "Disable Passcode", "Are you sure you want to disable your local passcode?", "Disable Passcode",
      function(){
        AuthenticationState.get().clearPasscode();
        this.setState(function(prevState){
          return _.merge(prevState, {hasPasscode: false})
        })
        this.forceUpdate();
      }.bind(this)
    )
  }

  render() {
    let signedIn = !Auth.getInstance().offline();
    return (
      <View style={GlobalStyles.styles().container}>
        <ScrollView style={{backgroundColor: GlobalStyles.constants().mainBackgroundColor}} keyboardShouldPersistTaps={'always'}>

          {!signedIn &&
            <AuthSection params={this.state.params} title={"Account"} onSignInPress={this.onSignInPress} onRegisterPress={this.onRegisterPress} />
          }

          <OptionsSection signedIn={signedIn} title={"Options"} onSignOutPress={this.onSignOutPress} onExportPress={this.onExportPress} />

          <ThemesSection themes={GlobalStyles.get().themes()} title={"Themes"} onThemeSelect={this.onThemeSelect} onThemeLongPress={this.onThemeLongPress} />

          <PasscodeSection
            hasPasscode={this.state.hasPasscode}
            onEnable={this.onPasscodeEnable}
            onDisable={this.onPasscodeDisable}
            title={"Local Passcode"}
          />

        </ScrollView>
      </View>
    );
  }
}

class AuthSection extends Component {
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

class ThemesSection extends Component {
  render() {
    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        {this.props.themes.map(function(theme, i) {
          return (
            <SectionedAccessoryTableCell
              onPress={() => this.props.onThemeSelect(theme)}
              onLongPress={() => this.props.onThemeLongPress(theme)}
              text={theme.mobileRules.name}
              key={theme.uuid}
              first={i == 0}
              selected={() => {return theme.active}}
              buttonCell={true}
              tinted={true}
            />
          )
        }.bind(this))}

      </TableSection>
    );
  }
}


class PasscodeSection extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        {this.props.hasPasscode &&
          <SectionedTableCell buttonCell={true} first={true}>
            <ButtonCell leftAligned={true} title="Disable Passcode Lock" onPress={this.props.onDisable} />
          </SectionedTableCell>
        }

        {!this.props.hasPasscode &&
          <SectionedTableCell buttonCell={true} first={true}>
            <ButtonCell leftAligned={true} title="Enable Passcode Lock" onPress={this.props.onEnable} />
          </SectionedTableCell>
        }

      </TableSection>
    );
  }
}

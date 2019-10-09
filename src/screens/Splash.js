import React, { Component } from 'react';
import { View, Text, KeyboardAvoidingView, SafeAreaView, ScrollView, Image, BackHandler, Keyboard } from 'react-native';
import StyleKit from "@Style/StyleKit"
import Abstract from "@Screens/Abstract"
import ApplicationState from "@Lib/ApplicationState"
import AlertManager from "@SFJS/alertManager"
import AuthSection from "@Screens/Settings/Sections/AuthSection"

export default class Splash extends Abstract {

  constructor(props) {
    super(props);
    this.state = {}
  }

  componentDidMount() {
    super.componentDidMount();
    BackHandler.addEventListener('hardwareBackPress', this.onBackButtonPressAndroid)
  }

  componentDidFocus() {
    super.componentDidFocus();
    // Tablets have Compose default to new note
    Keyboard.dismiss();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    BackHandler.removeEventListener('hardwareBackPress', this.onBackButtonPressAndroid)
  }

  onBackButtonPressAndroid = () => {
    // Disable back press
    return true;
  };

  render() {
    return (
      <SafeAreaView style={[StyleKit.styles.container, StyleKit.styles.baseBackground]}>
        <KeyboardAvoidingView style={{ flex: 1, flexDirection: 'column',justifyContent: 'center'}} behavior={ApplicationState.isAndroid ? null : 'padding'}>
          <ScrollView style={{backgroundColor: StyleKit.variable("stylekitBackgroundColor")}} keyboardShouldPersistTaps={'always'} keyboardDismissMode={'interactive'}>
            <View style={this.styles.headerContainer}>
              <Image style={this.styles.image} source={require('@Style/Images/sn-splash-logo.png')}/>
              <Text style={this.styles.headerFirstLine}>Create your free</Text>
              <Text style={this.styles.headerSecondLine}>
                <Text style={this.styles.headerBrandText}>Standard Notes </Text>
                <Text>account.</Text>
              </Text>
              <Text style={this.styles.subHeader}>Access your notes no matter which device you're on.</Text>
            </View>
            <AuthSection
              onAuthSuccess = {() => {this.dismiss()}}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  loadStyles() {
    this.styles = {
      headerContainer: {
        display: "flex",
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: "center",
        paddingTop: 20,
        padding: 15,
        color: StyleKit.variables.stylekitForegroundColor
      },
      image: {
        width: 175,
        height: 175,
        marginBottom: 20,
        resizeMode: "cover",
      },
      headerFirstLine: {
        fontSize: 30,
        fontWeight: "500",
        textAlign: "center",
        color: StyleKit.variables.stylekitForegroundColor
      },
      headerSecondLine: {
        fontSize: 30,
        fontWeight: "500",
        textAlign: "center",
        color: StyleKit.variables.stylekitForegroundColor
      },
      headerBrandText: {
        color: StyleKit.variables.stylekitInfoColor,
        fontWeight: "bold",
        textAlign: "center",
      },
      subHeader: {
        fontSize: 14,
        marginTop: 6,
        textAlign: "center",
        color: StyleKit.variables.stylekitForegroundColor
      }
    }
  }
}

import React, { Component } from 'react';
import { TextInput, View, TouchableHighlight, Platform} from 'react-native';
import GlobalStyles from "../Styles"
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import Abstract from "./Abstract"
import LockedView from "../containers/LockedView";
import {Navigation} from 'react-native-navigation';

export default class InputModal extends Abstract {

  constructor(props) {
    super(props);
    this.constructState({text: ""});
  }

  configureNavBar() {
    Navigation.mergeOptions(this.props.componentId, {
      topBar: {
        leftButtons: [
          {
            text: 'Cancel',
            id: 'cancel',
            showAsAction: 'ifRoom'
          },
        ],
        title: {
          text: this.props.title
        }
      }
    });
  }

  navigationButtonPressed({ buttonId }) {
    Navigation.dismissModal(this.props.componentId);
  }

  onSave = () => {
    if(this.props.validate) {
      if(!this.props.validate(this.state.text)) {
        this.props.onError(this.state.text);
        return;
      }
    }
    this.props.onSave(this.state.text);
    Navigation.dismissModal(this.props.componentId, {animationType: "slide-down"});
  }

  onTextChange = (text) => {
    this.setState({text: text})
  }

  render() {
    if(this.state.lockContent) {
      return (<LockedView />);
    }

    return (
      <View style={GlobalStyles.styles().container}>
        <TableSection extraStyles={[GlobalStyles.styles().container]}>
          <SectionHeader title={this.props.title} />
          <SectionedTableCell textInputCell={true} first={true}>
            <TextInput
              style={[GlobalStyles.styles().sectionedTableCellTextInput]}
              placeholder={this.props.placeholder}
              onChangeText={this.onTextChange}
              value={this.state.text}
              autoCorrect={false}
              autoCapitalize={'none'}
              autoFocus={true}
              placeholderTextColor={GlobalStyles.constants().mainDimColor}
              underlineColorAndroid={'transparent'}
              onSubmitEditing={this.onSave.bind(this)}
            />
          </SectionedTableCell>

          <ButtonCell maxHeight={45} disabled={this.state.text.length == 0} title={"Save"} bold={true} onPress={() => this.onSave()} />

        </TableSection>
      </View>
    );
  }

}

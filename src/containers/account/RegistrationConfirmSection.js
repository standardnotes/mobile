import React, { Component } from 'react';
import GlobalStyles from "../../Styles"
import {TextInput, Text, View, Alert} from 'react-native';

import SectionHeader from "../../components/SectionHeader";
import ButtonCell from "../../components/ButtonCell";
import TableSection from "../../components/TableSection";
import SectionedTableCell from "../../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../../components/SectionedAccessoryTableCell";

export default class RegistrationConfirmSection extends Component {
  constructor(props) {
    super(props);
    this.state = {password: props.password, passwordConfirmation: ""}
  }

  onConfirmPress = () => {
    if(this.state.password !== this.state.passwordConfirmation) {
      Alert.alert("Passwords Don't Match", "The passwords you entered do not match. Please try again.", [{text: 'OK', onPress: () => console.log('OK Pressed')}])
    } else {
      this.props.onSuccess();
    }
  }

  onCancel = () => {
    this.props.onCancel();
  }

  render() {
    var padding = GlobalStyles.constants().paddingLeft;
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        <Text style={[GlobalStyles.styles().uiText, {paddingLeft: padding, paddingRight: padding, marginBottom: padding}]}>
        Due to the nature of our encryption, Standard Notes cannot offer password reset functionality.
        If you forget your password, you will permanently lose access to your data.
        </Text>

        <SectionedTableCell first={true} textInputCell={true}>
          <TextInput
            style={GlobalStyles.styles().sectionedTableCellTextInput}
            placeholder={"Password confirmation"}
            onChangeText={(text) => this.setState({passwordConfirmation: text})}
            value={this.state.passwordConfirmation}
            secureTextEntry={true}
            autoFocus={true}
            underlineColorAndroid={'transparent'}
          />
        </SectionedTableCell>

        <SectionedTableCell buttonCell={true}>
          <ButtonCell disabled={this.state.registering}
          title={this.props.registering ? "Registering..." : "Register"} bold={true}
          onPress={() => this.onConfirmPress()} />
        </SectionedTableCell>

        <SectionedTableCell buttonCell={true}>
          <ButtonCell title="Cancel" onPress={() => this.onCancel()} />
        </SectionedTableCell>


      </TableSection>
    );
  }
}

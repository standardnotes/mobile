import React, { Component } from 'react';
import StyleKit from "@Style/StyleKit"
import {TextInput, Text, View, Alert} from 'react-native';

import SectionHeader from "@Components/SectionHeader";
import ButtonCell from "@Components/ButtonCell";
import TableSection from "@Components/TableSection";
import SectionedTableCell from "@Components/SectionedTableCell";
import SectionedAccessoryTableCell from "@Components/SectionedAccessoryTableCell";

export default class RegistrationConfirmSection extends Component {
  constructor(props) {
    super(props);
    this.state = {password: props.password, passwordConfirmation: ""}
  }

  onConfirmPress = () => {
    if(this.state.password !== this.state.passwordConfirmation) {
      Alert.alert("Passwords Don't Match", "The passwords you entered do not match. Please try again.", [{text: 'OK'}])
    } else {
      this.props.onSuccess();
    }
  }

  onCancel = () => {
    this.props.onCancel();
  }

  render() {
    var padding = 14;
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        <Text style={[StyleKit.styles.uiText, {paddingLeft: padding, paddingRight: padding, marginBottom: padding}]}>
        Due to the nature of our encryption, Standard Notes cannot offer password reset functionality.
        If you forget your password, you will permanently lose access to your data.
        </Text>

        <SectionedTableCell first={true} textInputCell={true}>
          <TextInput
            style={StyleKit.styles.sectionedTableCellTextInput}
            placeholder={"Password confirmation"}
            onChangeText={(text) => this.setState({passwordConfirmation: text})}
            value={this.state.passwordConfirmation}
            secureTextEntry={true}
            autoFocus={true}
            keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
            underlineColorAndroid={'transparent'}
          />
        </SectionedTableCell>

        <ButtonCell
          disabled={this.props.registering}
          title={this.props.registering ? "Generating Keys..." : "Register"}
          bold={true}
          onPress={() => this.onConfirmPress()}
        />

        <ButtonCell title="Cancel" onPress={() => this.onCancel()} />


      </TableSection>
    );
  }
}

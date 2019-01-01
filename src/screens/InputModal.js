import React, { Component } from 'react';
import { TextInput, View, TouchableHighlight, Platform} from 'react-native';
import StyleKit from "../style/StyleKit"
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import Abstract from "./Abstract"
import LockedView from "../containers/LockedView";

export default class InputModal extends Abstract {

  static navigationOptions = ({ navigation, navigationOptions }) => {
    let templateOptions = {
      leftButton: {
        title: "Done"
      }
    }
    return Abstract.getDefaultNavigationOptions({navigation, navigationOptions, templateOptions});
  };

  constructor(props) {
    super(props);

    props.navigation.setParams({
      leftButton: {
        title: "Done",
        onPress: () => {
          this.dismiss();
        }
      }
    })

    this.constructState({text: this.getProp("initialValue") || ""});
  }

  dismiss() {
    this.props.navigation.goBack(null);
  }

  onSave = () => {
    if(this.getProp("validate")) {
      if(!this.getProp("validate")(this.state.text)) {
        this.getProp("onError")(this.state.text);
        return;
      }
    }
    this.getProp("onSave")(this.state.text);
    this.dismiss();
  }

  onTextChange = (text) => {
    this.setState({text: text})
  }

  render() {
    if(this.state.lockContent) {
      return (<LockedView />);
    }

    return (
      <View style={[StyleKit.styles.container, StyleKit.styles.baseBackground]}>
        <TableSection extraStyles={[StyleKit.styles.container]}>
          <SectionedTableCell textInputCell={true} first={true}>
            <TextInput
              style={[StyleKit.styles.sectionedTableCellTextInput]}
              placeholder={this.getProp("placeholder")}
              onChangeText={this.onTextChange}
              value={this.state.text}
              autoCorrect={false}
              autoCapitalize={'none'}
              autoFocus={true}
              placeholderTextColor={StyleKit.variable("stylekitNeutralColor")}
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

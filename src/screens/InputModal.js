import React, { Component } from 'react';
import { TextInput, View, TouchableHighlight, Platform} from 'react-native';
import GlobalStyles from "../Styles"
import TableSection from "../components/TableSection";
import SectionedTableCell from "../components/SectionedTableCell";
import SectionHeader from "../components/SectionHeader";

export default class InputModal extends Component {

  constructor(props) {
    super(props);
    this.state = {text: ""};
    this.configureNavBar();
  }

  configureNavBar() {
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
    this.props.navigator.setButtons({
      rightButtons: [
        {
          title: 'Save',
          id: 'save',
          showAsAction: 'ifRoom',
          buttonColor: GlobalStyles.constants().mainTintColor,
          buttonFontWeight: "bold",
          buttonFontSize: 17
        },
      ],
      leftButtons: [
        {
          title: 'Cancel',
          id: 'cancel',
          showAsAction: 'ifRoom',
          buttonColor: GlobalStyles.constants().mainTintColor,
        },
      ],
      animated: false
    });
  }


  onNavigatorEvent(event) {
      if (event.type == 'NavBarButtonPress') {
        if(event.id == 'save') {
            this.props.onSave(this.state.text);
        }

        this.props.navigator.dismissModal({animationType: "slide-down"});
      }
  }

  onTextChange = (text) => {
    this.setState({text: text})
  }

  render() {
    return (
      <View style={GlobalStyles.styles().container}>
        <TableSection>
          <SectionHeader title={this.props.title} />
          <SectionedTableCell textInputCell={true} first={true}>
            <TextInput
              underlineColorAndroid='transparent'
              style={GlobalStyles.styles().sectionedTableCellTextInput}
              placeholder={this.props.placeholder}
              onChangeText={this.onTextChange}
              value={this.state.text}
              autoCorrect={false}
              autoCapitalize={'none'}
              autoFocus={true}
            />
          </SectionedTableCell>
        </TableSection>
      </View>
    );
  }

}

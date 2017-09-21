import React, { Component } from 'react';
import { StyleSheet, View, Text, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import GlobalStyles from "../Styles"

export default class NoteCell extends React.PureComponent {


  constructor(props) {
    super(props);
    this.state = {selected: false};
    let Padding = 14;

    this.styles = StyleSheet.create({

      noteCell: {
        padding: Padding,
        paddingRight: Padding * 2,
        borderBottomColor: GlobalStyles.constants().plainCellBorderColor,
        borderBottomWidth: 1,
        backgroundColor: GlobalStyles.constants().mainBackgroundColor,
      },

      noteCellSelected: {
        backgroundColor: GlobalStyles.constants().selectedBackgroundColor,
      },

      noteTags: {
        flex: 1,
        flexDirection: 'row',
        marginBottom: 5,
      },

      pinnedView: {
        flex: 1,
        flexDirection: 'row',
        marginBottom: 5,
      },

      pinnedText: {
        color: GlobalStyles.constants().mainTintColor,
        marginLeft: 8,
        fontWeight: "bold",
        fontSize: 12
      },

      noteTag: {
        marginRight: 2,
        fontSize: 12,
        color: GlobalStyles.constants().mainTextColor,
        opacity: 0.5,
      },

      noteTitle: {
        fontWeight: "bold",
        fontSize: GlobalStyles.constants().mainHeaderFontSize,
        color: GlobalStyles.constants().mainTextColor
      },

      noteText: {
        fontSize: GlobalStyles.constants().mainTextFontSize,
        marginTop: 4,
        color: GlobalStyles.constants().mainTextColor
      },

      noteDate: {
        marginTop: 5,
        fontSize: 12,
        color: GlobalStyles.constants().mainTextColor,
        opacity: 0.5
      },

      deleting: {
        color: GlobalStyles.constants().mainTintColor,
        marginBottom: 5,
      }
    });
  }

  _onPress = () => {
    this.setState({selected: true});
    this.props.onPressItem(this.props.item);
    this.setState({selected: false});
  };

  _onPressIn = () => {
    this.setState({selected: true});
  };

  _onPressOut = () => {
    this.setState({selected: false});
  };

  noteCellStyle = () => {
    if(this.state.selected) {
      return [styles.noteCell, styles.noteCellSelected];
    } else {
      return styles.noteCell;
    }
  }

  aggregateStyles(base, addition, condition) {
    if(condition) {
      return [base, addition];
    } else {
      return base;
    }
  }

  render() {
    var note = this.props.item;
    return (
       <TouchableWithoutFeedback onPress={this._onPress} onPressIn={this._onPressIn} onPressOut={this._onPressOut}>
        <View style={this.aggregateStyles(this.styles.noteCell, this.styles.noteCellSelected, this.state.selected)} onPress={this._onPress}>

          {note.deleted &&
            <Text style={this.styles.deleting}>Deleting...</Text>
          }

          {note.errorDecrypting &&
            <Text style={this.styles.deleting}>Error Decrypting</Text>
          }

          {note.conflictOf &&
            <Text style={this.styles.deleting}>Conflicted Copy</Text>
          }

          {note.pinned &&
            <View style={this.styles.pinnedView}>
              <Icon name={"ios-bookmark"} size={14} color={GlobalStyles.constants().mainTintColor} />
              <Text style={this.styles.pinnedText}>Pinned</Text>
            </View>
          }

          {note.tags.length > 0 &&
            <View style={this.styles.noteTags}>
              <Text numberOfLines={1} style={this.aggregateStyles(this.styles.noteTag)}>
              {note.tags.map(function(tag, i){
                var text = "#" + tag.title;
                if(i != note.tags.length - 1) {
                  text += " ";
                }
                return text;
              })}
              </Text>
            </View>
          }

          {note.safeTitle().length > 0 &&
            <Text style={this.aggregateStyles(this.styles.noteTitle, this.styles.noteTitleSelected, this.state.selected)}>{note.title}</Text>
          }

          {note.safeText().length > 0 &&
            <Text numberOfLines={2} style={this.aggregateStyles(this.styles.noteText, this.styles.noteTextSelected, this.state.selected)}>{note.text}</Text>
          }

          <Text
            numberOfLines={1}
            style={this.aggregateStyles(this.styles.noteDate, this.styles.noteDateSelected, this.state.selected)}>
            {this.props.sortType == "updated_at" ? "Modified " + note.updatedAt() : note.createdAt()}
          </Text>

        </View>
      </TouchableWithoutFeedback>
    )
  }
}

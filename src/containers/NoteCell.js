import React, { Component } from 'react';
import { StyleSheet, View, Text, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import GlobalStyles from "../Styles"

export default class NoteCell extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {selected: false};
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
        <View style={this.aggregateStyles(styles.noteCell, styles.noteCellSelected, this.state.selected)} onPress={this._onPress}>

          {note.deleted &&
            <Text style={styles.deleting}>Deleting...</Text>
          }

          {note.pinned &&
            <View style={styles.pinnedView}>
              <Icon name={"ios-bookmark"} size={14} color={GlobalStyles.constants().mainTintColor} />
              <Text style={styles.pinnedText}>Pinned</Text>
            </View>
          }

          {note.tags.length > 0 &&
            <View style={styles.noteTags}>
              <Text numberOfLines={1} style={this.aggregateStyles(styles.noteTag)}>
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
            <Text style={this.aggregateStyles(styles.noteTitle, styles.noteTitleSelected, this.state.selected)}>{note.title}</Text>
          }

          {note.safeText().length > 0 &&
            <Text numberOfLines={2} style={this.aggregateStyles(styles.noteText, styles.noteTextSelected, this.state.selected)}>{note.text}</Text>
          }

          <Text numberOfLines={1} style={this.aggregateStyles(styles.noteDate, styles.noteDateSelected, this.state.selected)}>{note.createdAt()}</Text>

        </View>
      </TouchableWithoutFeedback>
    )
  }
}

let Padding = 14;

const styles = StyleSheet.create({


  noteCell: {
    padding: Padding,
    paddingRight: Padding * 2,
    borderBottomColor: GlobalStyles.constants().plainCellBorderColor,
    borderBottomWidth: 1
  },

  noteCellSelected: {
    backgroundColor: "#efefef",
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
    color: "black",
    opacity: 0.5,
  },

  noteTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "black"
  },


  noteText: {
    fontSize: 15,
    marginTop: 4,
    color: "black"
  },


  noteDate: {
    marginTop: 5,
    fontSize: 12,
    color: "black",
    opacity: 0.5
  },

  deleting: {
    color: GlobalStyles.constants().mainTintColor,
    marginBottom: 5,

  }
});

import React, { Component } from 'react';
import { StyleSheet, View, Text, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import StyleKit from "@Style/StyleKit"
import ActionSheet from 'react-native-actionsheet'
import ActionSheetWrapper from "@Style/ActionSheetWrapper"
import ItemActionManager from '@Lib/itemActionManager'
import ThemedPureComponent from "@Components/ThemedPureComponent";

export default class NoteCell extends ThemedPureComponent {

  constructor(props) {
    super(props);
    this.state = {selected: false, options: props.options || {}};
  }

  componentWillReceiveProps(props) {
    this.setState({options: props.options || {}});
  }

  _onPress = () => {
    this.setState({selected: true});
    this.props.onPressItem(this.props.item);
    this.setState({selected: false});
  };

  _onPressIn = () => {
    // Debounce
    this.selectionTimeout = setTimeout(() => {
      this.setState({selected: true});
    }, 25);
  };

  _onPressOut = () => {
    if(this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
    }
    this.setState({selected: false});
  };

  aggregateStyles(base, addition, condition) {
    if(condition) {
      return [base, addition];
    } else {
      return base;
    }
  }

  showActionSheet = () => {
    let callbackForAction = (action) => {
      this.props.handleAction(this.props.item, action.key, () => {
        this.forceUpdate();
      });
    }

    var pinLabel = this.props.item.pinned ? "Unpin" : "Pin";
    let pinEvent = pinLabel == "Pin" ? ItemActionManager.PinEvent : ItemActionManager.UnpinEvent;

    var archiveLabel = this.props.item.archived ? "Unarchive" : "Archive";
    let archiveEvent = archiveLabel == "Archive" ? ItemActionManager.ArchiveEvent : ItemActionManager.UnarchiveEvent;

    var lockLabel = this.props.item.locked ? "Unlock" : "Lock";
    let lockEvent = lockLabel == "Lock" ? ItemActionManager.LockEvent : ItemActionManager.UnlockEvent;

    var protectLabel = this.props.item.content.protected ? "Unprotect" : "Protect";
    let protectEvent = protectLabel == "Protect" ? ItemActionManager.ProtectEvent : ItemActionManager.UnprotectEvent;

    let sheet;
    if(this.props.item.content.protected) {
      sheet = new ActionSheetWrapper({
        title: "Note Protected",
        options: [],
        onCancel: () => {
          this.setState({actionSheet: null});
        }
      });
    } else {
      let options = [
        ActionSheetWrapper.BuildOption({text: pinLabel, key: pinEvent, callback: callbackForAction}),
        ActionSheetWrapper.BuildOption({text: archiveLabel, key: archiveEvent, callback: callbackForAction}),
        ActionSheetWrapper.BuildOption({text: lockLabel, key: lockEvent, callback: callbackForAction}),
        ActionSheetWrapper.BuildOption({text: protectLabel, key: protectEvent, callback: callbackForAction}),
        ActionSheetWrapper.BuildOption({text: "Share", key: ItemActionManager.ShareEvent, callback: callbackForAction}),
      ]

      if(!this.props.item.content.trashed) {
        options.push(ActionSheetWrapper.BuildOption({text: "Move to Trash", key: ItemActionManager.TrashEvent, destructive: true, callback: callbackForAction}));
      } else {
        options.push(ActionSheetWrapper.BuildOption({text: "Delete Forever", key: ItemActionManager.DeleteEvent, destructive: true, callback: callbackForAction}));
      }

      sheet = new ActionSheetWrapper({
        title: this.props.item.safeTitle(),
        options: options,
        onCancel: () => {
          this.setState({actionSheet: null});
        }
      });
    }

    this.setState({actionSheet: sheet.actionSheetElement()});
    sheet.show();
  }

  getFlags(note) {
    let flags = [];

    if(note.pinned) {
      flags.push({
        text: "Pinned",
        color: StyleKit.variables.stylekitInfoColor
      })
    }

    if(note.archived) {
      flags.push({
        text: "Archived",
        color: StyleKit.variables.stylekitWarningColor
      })
    }

    if(note.content.protected) {
      flags.push({
        text: "Protected",
        color: StyleKit.variables.stylekitSuccessColor
      })
    }

    if(note.locked) {
      flags.push({
        text: "Locked",
        color: StyleKit.variables.stylekitNeutralColor
      })
    }

    if(note.content.trashed) {
      flags.push({
        text: "Deleted",
        color: StyleKit.variables.stylekitDangerColor
      })
    }

    return flags;
  }

  flagElement = (flag) => {
    let bgColor = flag.color;
    let textColor = StyleKit.variables.stylekitInfoContrastColor;
    if(this.state.selected || this.props.highlighted) {
      bgColor = StyleKit.variables.stylekitInfoContrastColor;
      textColor = flag.color
    }
    const styles = {
      background: {
        backgroundColor: bgColor,
        padding: 4,
        paddingLeft: 6,
        paddingRight: 6,
        borderRadius: 3,
        marginRight: 4
      },
      text: {
        color: textColor,
        fontSize: 10,
        fontWeight: "bold"
      }
    }
    return (
      <View key={flag.text} style={styles.background}>
        <Text style={styles.text}>{flag.text}</Text>
      </View>
    )
  }

  render() {
    var note = this.props.item;
    let showPreview = !this.state.options.hidePreviews && !note.content.protected && !note.content.hidePreview;
    let flags = this.getFlags(note);
    let showTagsString = this.props.renderTags && !this.state.options.hideTags && note.tags.length > 0 && !note.content.protected;

    let highlight = this.state.selected || this.props.highlighted;

    return (
       <TouchableWithoutFeedback onPress={this._onPress} onPressIn={this._onPressIn} onPressOut={this._onPressOut} onLongPress={this.showActionSheet}>
          <View style={this.aggregateStyles(this.styles.noteCell, this.styles.noteCellSelected, highlight)} onPress={this._onPress}>

            {note.deleted &&
              <Text style={this.styles.deleting}>Deleting...</Text>
            }

            {note.conflict_of &&
              <Text style={this.styles.deleting}>Conflicted Copy</Text>
            }

            {flags.length > 0 &&
              <View style={this.styles.flagsContainer}>
                {flags.map((flag) =>
                  this.flagElement(flag)
                )}
              </View>
            }

            {note.errorDecrypting &&
              <View>
                <Text style={[this.styles.noteTitle, this.styles.deleting]}>
                  {"Password Required."}
                </Text>
                <Text numberOfLines={2} style={this.aggregateStyles(this.styles.noteText, this.styles.noteTextSelected, highlight)}>
                  {"Please sign in to restore your decryption keys and notes."}
                </Text>
              </View>
            }

            {note.safeTitle().length > 0 &&
              <Text style={this.aggregateStyles(this.styles.noteTitle, this.styles.noteTitleSelected, highlight)}>
                {note.title}
              </Text>
            }

            {(note.content.preview_plain != null && showPreview) &&
              <Text numberOfLines={2} style={this.aggregateStyles(this.styles.noteText, this.styles.noteTextSelected, highlight)}>
                {note.content.preview_plain}
              </Text>
            }

            {(!note.content.preview_plain && showPreview && note.safeText().length > 0) &&
              <Text numberOfLines={2} style={this.aggregateStyles(this.styles.noteText, this.styles.noteTextSelected, highlight)}>
                {note.text}
              </Text>
            }

            {!this.state.options.hideDates &&
              <Text
                numberOfLines={1}
                style={this.aggregateStyles(this.styles.noteDate, this.styles.noteDateSelected, highlight)}>
                {this.props.sortType == "client_updated_at" ? "Modified " + note.updatedAtString() : note.createdAtString()}
              </Text>
            }

            {showTagsString &&
              <View style={this.styles.noteTagsContainer}>
                <Text numberOfLines={1} style={this.aggregateStyles(this.styles.noteTag, this.styles.noteTagSelected, highlight)}>
                  {this.props.tagsString}
                </Text>
              </View>
            }

            {this.state.actionSheet && this.state.actionSheet}
        </View>
      </TouchableWithoutFeedback>
    )
  }

  loadStyles() {
    let padding = 14;
    this.styles = StyleSheet.create({

      noteCell: {
        padding: padding,
        paddingRight: padding * 2,
        borderBottomColor: StyleKit.hexToRGBA(StyleKit.variables.stylekitBorderColor, 0.75),
        borderBottomWidth: 1,
        backgroundColor: StyleKit.variable("stylekitBackgroundColor"),
      },

      noteCellSelected: {
        backgroundColor: StyleKit.variable("stylekitInfoColor"),
      },

      noteTagsContainer: {
        flex: 1,
        flexDirection: 'row',
        marginTop: 7,
      },

      pinnedView: {
        flex: 1,
        flexDirection: 'row',
        marginBottom: 5,
      },

      flagsContainer: {
        flex: 1,
        flexDirection: 'row',
        marginBottom: 8
      },

      noteTag: {
        marginRight: 2,
        fontSize: 12,
        color: StyleKit.variable("stylekitForegroundColor"),
        opacity: 0.5,
      },

      noteTagSelected: {
        color: StyleKit.variable("stylekitInfoContrastColor"),
        opacity: 0.8
      },

      noteTitle: {
        fontWeight: "bold",
        fontSize: 16,
        color: StyleKit.variable("stylekitForegroundColor")
      },

      noteTitleSelected: {
        color: StyleKit.variable("stylekitInfoContrastColor")
      },

      noteText: {
        fontSize: 15,
        marginTop: 4,
        color: StyleKit.variable("stylekitForegroundColor"),
        opacity: 0.8,
        lineHeight: 21
      },

      noteTextSelected: {
        color: StyleKit.variable("stylekitInfoContrastColor")
      },

      noteDate: {
        marginTop: 5,
        fontSize: 12,
        color: StyleKit.variable("stylekitForegroundColor"),
        opacity: 0.5
      },

      noteDateSelected: {
        color: StyleKit.variable("stylekitInfoContrastColor"),
        opacity: 0.8
      },

      deleting: {
        color: StyleKit.variable("stylekitInfoColor"),
        marginBottom: 5,
      }
    });
  }
}

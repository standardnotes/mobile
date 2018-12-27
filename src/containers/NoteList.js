import React, { Component } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, ScrollView, Text } from 'react-native';
import NoteCell from "./NoteCell"
import Search from 'react-native-search-box'
import GlobalStyles from "../Styles"
import ApplicationState from "../ApplicationState"

export default class NoteList extends Component {

  constructor(props) {
    super(props);
    this.styles = StyleSheet.create({
      container: {
        flex: 1,
      },

      decryptNoticeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
        position: "absolute",
        height: "100%",
        width: "100%"
      },

      decryptNotice: {
        position: "absolute",
        opacity: 0.5,
        color: GlobalStyles.constants().mainTextColor
      }
    });
  }

  renderHeader = () => {
    return (
      <View style={{paddingLeft: 5, paddingRight: 5, paddingTop: 5, backgroundColor: GlobalStyles.constants().mainBackgroundColor}}>
        <Search
          onChangeText={this.props.onSearchChange}
          onCancel={this.props.onSearchCancel}
          onDelete={this.props.onSearchCancel}
          blurOnSubmit={true}
          backgroundColor={GlobalStyles.constants().mainBackgroundColor}
          titleCancelColor={GlobalStyles.constants().mainTintColor}
          keyboardDismissMode={'interactive'}
          inputStyle={{backgroundColor: GlobalStyles.constants().plainCellBorderColor, color: GlobalStyles.constants().mainTextColor}}
        />
      </View>
    );
  };

  // must pass title, text, and tags as props so that it re-renders when either of those change
  _renderItem = ({item}) => {
    // On Android, only one tag is selected at a time. If it is selected, we don't need to display the tags string
    // above the note cell
    let selectedTags = this.props.selectedTags || [];
    let renderTags = ApplicationState.isIOS || selectedTags.length == 0 || (!item.tags.includes(selectedTags[0]));

    return (
      <NoteCell
        item={item}
        onPressItem={this.props.onPressItem}
        title={item.title}
        text={item.text}
        tags={item.tags}
        tagsString={item.tagsString()}
        pinned={item.pinned}
        deleted={item.deleted}
        archived={item.archived}
        sortType={this.props.sortType}
        renderTags={renderTags}
        options={this.props.options}
      />
    )
  }

  render() {
    var placeholderText = "";
    if(this.props.decrypting) {
      placeholderText = "Decrypting notes...";
    } else if(this.props.loading) {
      placeholderText = "Loading notes...";
    } else if(this.props.notes.length == 0) {
      placeholderText = "No notes.";
    }

    return (
      <View style={{backgroundColor: GlobalStyles.constants().mainBackgroundColor}}>

        {placeholderText.length > 0 &&
          <View style={this.styles.decryptNoticeContainer}>
            <Text style={this.styles.decryptNotice}>
              {placeholderText}
            </Text>
          </View>
        }

        <FlatList style={{height: "100%"}}
          initialNumToRender={6}
          windowSize={6}
          maxToRenderPerBatch={6}
          keyboardDismissMode={'interactive'}
          keyboardShouldPersistTaps={'always'}
          refreshControl={!this.props.hasRefreshControl ? null :
            <RefreshControl
              refreshing={this.props.refreshing}
              onRefresh={this.props.onRefresh}
            />
          }
          data={this.props.notes}
          options={this.props.options}
          renderItem={this._renderItem}
          ListHeaderComponent={this.renderHeader}
        />

      </View>
    )
  }
}

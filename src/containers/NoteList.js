import React, { Component } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import NoteCell from "./NoteCell"
import Search from 'react-native-search-box'
import GlobalStyles from "../Styles"

export default class NoteList extends Component {

  renderHeader = () => {
    return (
      <View style={{paddingLeft: 5, paddingRight: 5, paddingTop: 5}}>
        <Search
          onChangeText={this.onSearchTextChange}
          onCancel={this.onSearchCancel}
          onDelete={this.onSearchCancel}
          backgroundColor={GlobalStyles.constants.mainBackgroundColor}
          titleCancelColor={GlobalStyles.constants.mainTintColor}
        />
      </View>
    );
  };

  // must pass title, text, and tags as props so that it re-renders when either of those change
  _renderItem = ({item}) => (
    <NoteCell
      item={item}
      onPressItem={this.props.onPressItem}
      title={item.title}
      text={item.text}
      tags={item.tags}
      pinned={item.pinned}
    />
  )

  render() {
    return (
      <View style={styles.tableContainer}>
        <FlatList style={{height: "100%"}}
          refreshControl={
            <RefreshControl
              refreshing={this.props.refreshing}
              onRefresh={this.props.onRefresh}
            />
          }
          removeClippedSubviews={false}
          data={this.props.notes}
          renderItem={this._renderItem}
          ListHeaderComponent={this.renderHeader}
        />
      </View>
    )
  }
}

let Padding = 14;

const styles = StyleSheet.create({

  tableContainer: {
    backgroundColor: 'white',
  },

});

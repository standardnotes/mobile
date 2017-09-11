import React, { Component } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, ScrollView } from 'react-native';
import NoteCell from "./NoteCell"
import Search from 'react-native-search-box'
import GlobalStyles from "../Styles"

export default class NoteList extends Component {

  renderHeader = () => {
    return (
      <View style={{paddingLeft: 5, paddingRight: 5, paddingTop: 5}}>
        <Search
          onChangeText={this.props.onSearchChange}
          onCancel={this.props.onSearchCancel}
          onDelete={this.props.onSearchCancel}
          backgroundColor={GlobalStyles.constants().mainBackgroundColor}
          titleCancelColor={GlobalStyles.constants().mainTintColor}
          keyboardDismissMode={'interactive'}
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
      deleted={item.deleted}
      archived={item.archived}
    />
  )

  render() {
    return (
      <View style={styles.tableContainer}>
        <FlatList style={{height: "100%"}}
          keyboardDismissMode={'interactive'}
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

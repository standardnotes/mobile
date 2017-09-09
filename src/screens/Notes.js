import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  StatusBar,
  Text,
  View,
  FlatList,
  TouchableHighlight,
  TouchableWithoutFeedback,
  RefreshControl,
  Platform
} from 'react-native';

import ModelManager from '../lib/modelManager'
import Storage from '../lib/storage'
import Sync from '../lib/sync'
import Auth from '../lib/auth'

import GlobalStyles from "../Styles"

import {iconsMap, iconsLoaded} from '../Icons';
import Search from 'react-native-search-box';

export default class Notes extends Component {

  constructor(props) {
    super(props);
    this.state = {date: Date.now(), refreshing: false};
    this.options = {selectedTags: []};

    Sync.getInstance().registerSyncObserver(function(changesMade){
      if(changesMade) {
        this.loadNotes();
      } else {
        this.setState({refreshing: false});
      }
    }.bind(this))

    Auth.getInstance().onSignOut(function(){
      this.options = {selectedTags: []};
      this.loadNotes();
    }.bind(this));

    this.getOptionsAndLoadNotes();
    this.configureNavBar();
  }

  getOptionsAndLoadNotes() {
    Storage.getItem("options").then(function(result){
      this.options = JSON.parse(result) || {selectedTags: []};
      this.loadNotes();
    }.bind(this))
  }

  configureNavBar() {
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));

    var notesTitle = "Notes";
    var filterTitle = "Filter";
    var numFilters = this.options.selectedTags.length;
    if(numFilters > 0) {
      filterTitle += ` (${numFilters})`
      notesTitle = "Filtered Notes";
    }
    this.props.navigator.setTitle({title: notesTitle});

    var rightButtons = [];
    if(Platform.OS == "ios") {
      rightButtons.push({
        title: 'New',
        id: 'new',
        showAsAction: 'ifRoom',
        buttonColor: GlobalStyles.constants.mainTintColor,
      })
    }

    this.props.navigator.setButtons({
      rightButtons: rightButtons,
      leftButtons: [
        {
          title: filterTitle,
          id: 'sideMenu',
          showAsAction: 'ifRoom',
          buttonColor: GlobalStyles.constants.mainTintColor,
        },
      ],
      fab: {
        collapsedId: 'new',
        collapsedIcon: iconsMap['md-add'],
        backgroundColor: GlobalStyles.constants.mainTintColor
      },
      animated: false
    });
  }

  onNavigatorEvent(event) {

    switch(event.id) {
      case 'willAppear':
       this.activeScreen = true;
       this.forceUpdate();
       this.configureNavBar();
       if(this.needsLoadNotes) {
         this.needsLoadNotes = false;
         this.loadNotes();
       }
       break;
      case 'didAppear':
        break;
      case 'willDisappear':
        this.activeScreen = false;
        break;
      case 'didDisappear':
        break;
      }

    if (event.type == 'NavBarButtonPress') {
      if (event.id == 'new') {
        this.props.navigator.push({
          screen: 'sn.Compose',
          title: 'Compose',
        });
      }

      else if (event.id == 'sideMenu') {
        this.props.navigator.showModal({
          screen: 'sn.Filter',
          title: 'Options',
          animationType: 'slide-up',
          passProps: {
            options: this.options,
            onOptionsChange: (options) => {
              this.setOptions(options);
            }
          }
        });
      }
    }
  }


  loadNotes = (reloadNavBar = true) => {
    if(!this.activeScreen) {
      this.needsLoadNotes = true;
      return;
    }

    var notes;
    if(this.options.selectedTags && this.options.selectedTags.length > 0) {
      var tags = ModelManager.getInstance().getItemsWithIds(this.options.selectedTags);
      if(tags.length > 0) {
        var taggedNotes = new Set();
        for(var tag of tags) {
          taggedNotes = new Set([...taggedNotes, ...new Set(tag.notes)])
        }
        notes = Array.from(taggedNotes);
      }
    }

    if(!notes) {
      notes = ModelManager.getInstance().notes;
    }

    var searchTerm = this.options.searchTerm;
    if(searchTerm) {
      notes = notes.filter(function(note){
        return note.safeTitle().includes(searchTerm) || note.safeText().includes(searchTerm);
      })
    }

    var sortBy = this.options.sortBy;
    this.notes = notes.sort(function(a, b){
      let vector = sortBy == "title" ? -1 : 1;
      var aValue = a[sortBy] || "";
      var bValue = b[sortBy] || "";
      if(aValue > bValue) { return -1 * vector;}
      else if(aValue < bValue) { return 1 * vector;}
      return 0;
    })

    this.reloadList();
    // this function may be triggled asyncrounsly even when on a different screen
    // we dont want to update the nav bar unless we are the present screen
    if(reloadNavBar && this.activeScreen) {
      this.configureNavBar();
    }
  }

  reloadList() {
    this.setState((prevState, props) => {
      return {date: Date.now(), refreshing: false};
    });
  }

  setOptions(options) {
    this.options = options;
    Storage.setItem("options", JSON.stringify(options));
    this.loadNotes();
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _onRefresh() {
    this.setState({refreshing: true});
    Sync.getInstance().sync();
  }

  _onPressItem = (item: hash) => {
    this.props.navigator.push({
      screen: 'sn.Compose',
      title: 'Compose',
      passProps: {noteId: item.uuid}
    });
  }

  // must pass title and text as props so that it re-renders when either of those change
  _renderItem = ({item}) => (
    <NoteCell
      item={item}
      onPressItem={this._onPressItem}
      title={item.title}
      text={item.text}
    />
  )

  onSearchTextChange = (text) => {
    this.options.searchTerm = text;
    this.loadNotes(false);
  }

  onSearchCancel = () => {
    this.options.searchTerm = null;
    this.loadNotes(false);
  }

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

  render() {
    return (
      <View style={styles.container}>
        <View>
          <FlatList style={{height: "100%"}}
            refreshControl={
              <RefreshControl
                refreshing={this.state.refreshing}
                onRefresh={this._onRefresh.bind(this)}
              />
            }
            removeClippedSubviews={false}
            data={this.notes}
            renderItem={this._renderItem}
            ListHeaderComponent={this.renderHeader}
          />
        </View>
      </View>
    );
  }
}

class NoteCell extends React.PureComponent {
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
    return (
       <TouchableWithoutFeedback onPress={this._onPress} onPressIn={this._onPressIn} onPressOut={this._onPressOut}>
        <View style={this.aggregateStyles(styles.noteCell, styles.noteCellSelected, this.state.selected)} onPress={this._onPress}>

          {this.props.item.safeTitle().length > 0 &&
            <Text style={this.aggregateStyles(styles.noteTitle, styles.noteTitleSelected, this.state.selected)}>{this.props.item.title}</Text>
          }

          {this.props.item.safeText().length > 0 &&
            <Text numberOfLines={2} style={this.aggregateStyles(styles.noteText, styles.noteTextSelected, this.state.selected)}>{this.props.item.text}</Text>
          }

        </View>
      </TouchableWithoutFeedback>
    )
  }
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },

  navBar: {
    backgroundColor: "#086DD6",
    height: 62
  },

  navBarTitle: {
    textAlign: "center",
    color: "white",
    fontWeight: "bold",
    marginTop: 28,
    fontSize: 19
  },

  noteCell: {
    padding: 14,
    paddingRight: 28,
    borderBottomColor: GlobalStyles.constants.plainCellBorderColor,
    borderBottomWidth: 1,
  },

  noteCellSelected: {
    backgroundColor: "#efefef",
  },

  noteTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "black"
  },

  noteTitleSelected: {

  },

  noteText: {
    fontSize: 15,
    marginTop: 5,
    color: "black"
  },

  noteTextSelected: {

  },
});

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
  RefreshControl
} from 'react-native';

import ModelManager from '../lib/modelManager'
import Storage from '../lib/storage'
import Sync from '../lib/sync'

import GlobalStyles from "../Styles"

export default class Notes extends Component {

  constructor(props) {
    super(props);
    this.state = {date: Date.now(), refreshing: false};

    Sync.getInstance().registerSyncObserver(function(changesMade){
      console.log("Sync completed with changes?", changesMade);
      if(changesMade) {
        this.loadNotes();
      } else {
        this.setState({refreshing: false});
      }
    }.bind(this))

    this.getOptionsAndLoadNotes();
    this.configureNavBar();
  }

  getOptionsAndLoadNotes() {
    Storage.getItem("options").then(function(result){
      this.options = JSON.parse(result);
      this.loadNotes();
    }.bind(this))
  }

  configureNavBar() {
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));

    this.props.navigator.setButtons({
      leftButtons: [],
      rightButtons: [
        {
          title: 'New',
          id: 'new',
          showAsAction: 'ifRoom',
          buttonColor: GlobalStyles.constants.mainTintColor,
        },
      ],
      leftButtons: [
        {
          title: 'Filter',
          id: 'filter',
          showAsAction: 'ifRoom',
          buttonColor: GlobalStyles.constants.mainTintColor,
        },
      ],
      animated: false
    });
  }

  loadNotes = () => {
    console.log("Load notes with options", this.options);
    var notes;
    if(this.options.selectedTags && this.options.selectedTags.length > 0) {
      var tags = ModelManager.getInstance().getItemsWithIds(this.options.selectedTags);
      var taggedNotes = new Set();
      for(var tag of tags) {
        taggedNotes = new Set([...taggedNotes, ...new Set(tag.notes)])
      }
      notes = Array.from(taggedNotes);
    } else {
      notes = ModelManager.getInstance().notes;
    }

    console.log("Loaded notes", notes);

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
  }

  reloadList() {
    this.setState((prevState, props) => {
      return {date: Date.now(), refreshing: false};
    });
  }

  onNavigatorEvent(event) {

    if (event.type == 'NavBarButtonPress') {
      if (event.id == 'new') {
        this.props.navigator.push({
          screen: 'sn.Compose',
          title: 'Compose',
        });
      }

      else if (event.id == 'filter') {
        this.props.navigator.showModal({
          screen: 'sn.Filter',
          title: 'Options',
          animationType: 'slide-up',
          passProps: {
            options: this.options,
            onOptionsChange: (options) => {
              this.setOptions(options);
              console.log("Options changed", options);
            }
          }
        });
      }
    }
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

  render() {
    console.log("Rendering notes list", this.state, this.notes);

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

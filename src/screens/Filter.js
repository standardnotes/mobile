import React, { Component } from 'react';
import { TextInput, SectionList, ScrollView, View, Text, Linking, Share, Platform, StatusBar, FlatList, Dimensions } from 'react-native';
import Sync from '../lib/sfjs/syncManager'
import ModelManager from '../lib/sfjs/modelManager'
import ComponentManager from '../lib/componentManager'
import AlertManager from '../lib/sfjs/alertManager'
import ItemActionManager from '../lib/itemActionManager'
import SectionHeader from "../components/SectionHeader";
import ButtonCell from "../components/ButtonCell";
import TableSection from "../components/TableSection";
import ManageNote from "../containers/ManageNote";
import LockedView from "../containers/LockedView";
import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";
import Abstract from "./Abstract"
import Icons from '../Icons';
import OptionsState from "../OptionsState"
import GlobalStyles from "../Styles"
import ApplicationState from "../ApplicationState";
import ActionSheet from 'react-native-actionsheet'

import { SafeAreaView } from 'react-navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import FAB from 'react-native-fab';

export default class Filter extends Abstract {

  static navigationOptions = ({ navigation, navigationOptions }) => {
    let templateOptions = {
      title: "Options"
    }
    return Abstract.getDefaultNavigationOptions({navigation, navigationOptions, templateOptions});
  };

  constructor(props) {
    super(props);
    this.tags = [];
  }

  loadInitialState() {
    super.loadInitialState();
    if(this.getProp("options")) {
      this.options = new OptionsState(JSON.parse(this.getProp("options")));
    } else {
      this.options = ApplicationState.getOptions();
    }

    var selectedTags;
    if(this.options.selectedTags) {
      selectedTags = this.options.selectedTags.slice(); // copy the array
    } else {
      selectedTags = [];
    }

    this.mergeState({tags: [], selectedTags: selectedTags, options: this.options});

    if(this.getProp("noteId")) {
      this.note = ModelManager.get().findItem(this.getProp("noteId"));
    }

    let handleInitialDataLoad = () => {
      if(this.handledDataLoad) { return; }
      this.handledDataLoad = true;

      this.loadTags = true;
      this.forceUpdate();
    }

    if(Sync.get().initialDataLoaded()) {
      handleInitialDataLoad();
    }

    this.syncEventHandler = Sync.get().addEventHandler((event, data) => {
      if(event == "local-data-loaded") {
        handleInitialDataLoad();
      }

      else if(event == "sync:completed") {
        if(data.retrievedItems && _.find(data.retrievedItems, {content_type: "Tag"})) {
          this.forceUpdate();
        }
      }
    })
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    ApplicationState.get().removeStateObserver(this.stateObserver);
    Sync.get().removeEventHandler(this.syncEventHandler);
  }

  componentDidFocus() {
    super.componentDidFocus();
    this.forceUpdate();
  }

  componentDidBlur() {
    super.componentDidBlur();

    // will disappear
    if(!this.isSingleSelectMode) {
      // we prefer to notify the parent via NavBarButtonPress.accept, but when this view is presented via nav push,
      // the user can swipe back and miss that. So we do it here as a backup.
      if(!this.didNotifyParent) {
        this.notifyParentOfOptionsChange();
      }
    }
  }

  dismiss = () => {
    this.props.navigation.goBack();
  }

  notifyParentOfOptionsChange() {
    this.getProp("onOptionsChange")(this.options);
  }

  presentNewTag() {
    this.props.navigation.navigate("NewTag", {
      title: 'New Tag',
      placeholder: "New tag name",
      onSave: (text) => {
        this.createTag(text, (tag) => {
          if(this.note) {
            // select this tag
            this.onTagSelect(tag)
          }
        });
      }
    })
  }

  createTag(text, callback) {
    var tag = new SNTag({content: {title: text}});
    tag.initUUID().then(() => {
      tag.setDirty(true);
      ModelManager.get().addItem(tag);
      Sync.get().sync();
      callback(tag);
      this.forceUpdate();
    })
  }

  onSortChange = (key) => {
    this.options.setSortBy(key);
    if(this.isSingleSelectMode) {
      this.notifyParentOfOptionsChange();
    }
  }

  onTagSelect = (tag) => {
    var selectedTags;

    if(this.isSingleSelectMode) {
      selectedTags = [tag.uuid];
    } else {
      selectedTags = this.state.selectedTags;
      var selected = selectedTags.includes(tag.uuid);
      if(selected) {
        // deselect
        selectedTags.splice(selectedTags.indexOf(tag.uuid), 1);
      } else {
        // select
        selectedTags.push(tag.uuid);
      }
    }

    this.setSelectedTags(selectedTags);
  }

  setSelectedTags = (selectedTags) => {
    this.selectedTags = selectedTags.slice();
    this.options.setSelectedTags(selectedTags);
    this.setState({selectedTags: selectedTags});

    if(this.isSingleSelectMode) {
      this.notifyParentOfOptionsChange();
    }
  }

  isTagSelected(tag) {
    return this.tags.indexOf(tag.uuid) !== -1;
  }

  onManageTagEvent = (event, tag, renderBlock) => {
    ItemActionManager.handleEvent(event, tag, () => {
        if(event == ItemActionManager.DeleteEvent) {
          this.loadTags = true;
          this.forceUpdate();
        }
    }, () => {
      // afterConfirmCallback
      // We want to show "Deleting.." on top of note cell after the user confirms the dialogue
      renderBlock();
    })
  }

  onManageNoteEvent(event) {
    ItemActionManager.handleEvent(event, this.note, () => {
        this.getProp("onManageNoteEvent")();
        if(event == ItemActionManager.DeleteEvent) {
          Navigation.popToRoot({
            animated: true,
          });
        }
    })
  }

  onOptionSelect = (option) => {
    this.options.setDisplayOptionKeyValue(option, !this.options.getDisplayOptionValue(option));
    this.forceUpdate();
    // this.mergeState({archivedOnly: this.options.archivedOnly});

    if(this.isSingleSelectMode) {
      this.notifyParentOfOptionsChange();
    }
  }

  onEditorSelect = (editor) => {

    if(editor) {
      ComponentManager.get().associateEditorWithNote(editor, this.note);
    } else {
      ComponentManager.get().clearEditorForNote(this.note);
    }

    this.getProp("onEditorSelect") && this.getProp("onEditorSelect")(editor);

    this.dismiss();
  }

  getEditors() {
    return ModelManager.get().validItemsForContentType("SN|Component").filter(function(component){
      return component.area == "editor-editor";
    })
  }

  clearTags = (close) => {
    this.setSelectedTags([]);
    if(close) { this.dismiss(); }
  }

  presentSettings() {
    this.props.navigation.navigate("Settings");
  }

  get isSingleSelectMode() {
    return this.getProp("singleSelectMode");
  }

  render() {
    var viewStyles = [GlobalStyles.styles().container];

    if(this.state.lockContent) {
      return (<LockedView style={viewStyles} />);
    }

    if(this.loadTags) {
      var tags = ModelManager.get().tags.slice();
      if(this.isSingleSelectMode) {
        tags.unshift({title: "All notes", key: "all", uuid: 100})
      }
      this.tags = tags;
    }

    return (
      <SafeAreaView style={viewStyles}>
        <ScrollView style={GlobalStyles.styles().view}>

          {!this.note &&
            <SortSection sortBy={this.options.sortBy} onSortChange={this.onSortChange} title={"Sort By"} />
          }

          {!this.note &&
            <OptionsSection options={this.options.getDisplayOptionValues()} onOptionSelect={this.onOptionSelect} title={"Options"} />
          }

          { this.note &&
            <ManageNote note={this.note} title={"Manage Note"} onEvent={this.onManageNoteEvent.bind(this)}/>
          }

          { this.note &&
            <EditorsSection editors={this.getEditors()} selectedEditor={ComponentManager.get().editorForNote(this.note)} title={"Edit With"} onEditorSelect={this.onEditorSelect.bind(this)}/>
          }

          <TagsSection
            tags={this.tags}
            selected={this.state.selectedTags}
            onTagSelect={this.onTagSelect}
            hasClearButton={!this.isSingleSelectMode && this.state.selectedTags.length > 0}
            clearSelection={this.clearTags}
            onManageTagEvent={this.onManageTagEvent}
            title={"Tags"}
           />
        </ScrollView>

        <FAB
          buttonColor={GlobalStyles.constants().mainTintColor}
          iconTextColor={GlobalStyles.constants().mainBackgroundColor}
          onClickAction={() => {this.note ? this.presentNewTag() : this.presentSettings()}}
          visible={true}
          iconTextComponent={<Icon name={this.note ? "md-pricetag" : "md-settings"}/>}
        />

      </SafeAreaView>
    );
  }
}


class TagsSection extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  onPress = (tag) => {
    this.props.onTagSelect(tag);
  }

  onLongPress = (tag) => {
    this.props.onTagLongPress(tag);
  }

  static ActionSheetCancelIndex = 0;
  static ActionSheetDestructiveIndex = 1;

  actionSheetActions() {
    return [
      ['Cancel', ""],
      ['Delete', ItemActionManager.DeleteEvent]
    ];
  }

  showActionSheet = (item) => {
    // Dont show actionsheet for "All notes" tag
    if(item.key !== "all") {
      this.actionSheetItem = item;
      this.setState((prevState) => {
        return _.merge(prevState, {actionSheetTitle: item.title})
      })
      this.actionSheet.show();
    }
  }

  handleActionSheetPress = (index) => {
    if(index == 0) {
      return;
    }

    this.props.onManageTagEvent(this.actionSheetActions()[index][1], this.actionSheetItem, () => {
      this.forceUpdate();
    });
    this.actionSheetItem = null;
  }

  // must pass title, text, and tags as props so that it re-renders when either of those change
  _renderItem = ({item}) => {
    return (
      <View>
        <SectionedAccessoryTableCell
          onPress={() => {this.onPress(item)}}
          onLongPress={() => this.showActionSheet(item)}
          text={item.deleted ? "Deleting..." : item.title}
          color={item.deleted ? GlobalStyles.constants().mainTintColor : undefined}
          key={item.uuid}
          first={this.props.tags.indexOf(item) == 0}
          last={this.props.tags.indexOf(item) == this.props.tags.length - 1}
          selected={() => {return this.props.selected.includes(item.uuid)}}
        />

        <ActionSheet
          title={this.state.actionSheetTitle}
          ref={o => this.actionSheet = o}
          options={this.actionSheetActions().map((action) => {return action[0]})}
          cancelButtonIndex={TagsSection.ActionSheetCancelIndex}
          destructiveButtonIndex={TagsSection.ActionSheetDestructiveIndex}
          onPress={this.handleActionSheetPress}
          {...GlobalStyles.actionSheetStyles()}
        />
      </View>
    )
  }

  render() {
    return (
      <TableSection style={GlobalStyles.styles().view}>
        <SectionHeader title={this.props.title} buttonText={this.props.hasClearButton && "Clear"} buttonAction={() => {this.props.clearSelection(true)}}/>

        <FlatList style={{height: "100%"}}
          initialNumToRender={10}
          windowSize={10}
          maxToRenderPerBatch={10}
          data={this.props.tags}
          renderItem={this._renderItem}
        />

      </TableSection>
    );
  }
}

class OptionsSection extends Component {
  constructor(props) {
    super(props);
    // this.state = {archivedOnly: props.archivedOnly}
  }

  onOptionSelect = (option) => {
    this.props.onOptionSelect(option);
  }

  render() {
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        <SectionedAccessoryTableCell
          onPress={() => {this.onOptionSelect('archivedOnly')}}
          text={"Show only archived notes"}
          first={true}
          selected={() => {return this.props.options.archivedOnly}}
        />

        <SectionedAccessoryTableCell
          onPress={() => {this.onOptionSelect('hidePreviews')}}
          text={"Hide note previews"}
          selected={() => {return this.props.options.hidePreviews}}
        />

        <SectionedAccessoryTableCell
          onPress={() => {this.onOptionSelect('hideTags')}}
          text={"Hide note tags"}
          selected={() => {return this.props.options.hideTags}}
        />

        <SectionedAccessoryTableCell
          onPress={() => {this.onOptionSelect('hideDates')}}
          text={"Hide note dates"}
          last={true}
          selected={() => {return this.props.options.hideDates}}
        />

      </TableSection>
    );
  }
}

class SortSection extends Component {
  constructor(props) {
    super(props);
    this.state = {sortBy: props.sortBy}
    this.options = [
      {key: "created_at", label: "Date Added"},
      {key: "client_updated_at", label: "Date Modified"},
      {key: "title", label: "Title"},
    ];
  }

  onPress = (key) => {
    this.setState({sortBy: key});
    this.props.onSortChange(key);
  }

  render() {
    let root = this;
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />
        {this.options.map(function(option, i){
          return (
            <SectionedAccessoryTableCell
              onPress={() => {root.onPress(option.key)}}
              text={option.label}
              key={option.key}
              first={i == 0}
              last={i == root.options.length - 1}
              selected={() => {return option.key == root.state.sortBy}}
            />
          )
        })}

      </TableSection>
    );
  }
}

class EditorsSection extends Component {
  constructor(props) {
    super(props);
  }

  onPress = (editor) => {
    this.props.onEditorSelect(editor);
  }

  getEditors = () => {
    Linking.openURL("https://standardnotes.org/extensions");
  }

  clearEditorSelection = () => {
    this.props.onEditorSelect(null);
  }

  render() {
    let root = this;
    return (
      <TableSection style={GlobalStyles.styles().view}>
        <SectionHeader title={this.props.title} buttonText={this.props.selectedEditor && "Use Plain"} buttonAction={() => {this.clearEditorSelection()}}/>
        {this.props.editors.map(function(editor, i){
          return (
            <SectionedAccessoryTableCell
              onPress={() => {root.onPress(editor)}}
              text={editor.name}
              key={editor.uuid}
              first={i == 0}
              selected={() => {return editor == root.props.selectedEditor}}
              buttonCell={true}
            />
          )
        })}

        {this.props.editors.length == 0 &&
          <SectionedAccessoryTableCell
            onPress={() => {root.getEditors()}}
            text={"Get Editors  →"}
            first={true}
            buttonCell={true}
          />
        }


      </TableSection>
    );
  }
}

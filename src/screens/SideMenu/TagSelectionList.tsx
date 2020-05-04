import React, { Fragment } from 'react';
import { View, Text, FlatList, ViewStyle, TextStyle } from 'react-native';
import { withNavigation } from 'react-navigation';
import ThemedComponent from '@Components/ThemedComponent';
import ItemActionManager from '@Lib/itemActionManager';
import { SCREEN_INPUT_MODAL } from '@Screens/screens';
import Auth from '@Lib/snjs/authManager';
import ModelManager from '@Lib/snjs/modelManager';
import Sync from '@Lib/snjs/syncManager';
import SideMenuCell from '@Screens/SideMenu/SideMenuCell';
import ActionSheetWrapper from '@Style/ActionSheetWrapper';
import StyleKit from '@Style/StyleKit';

import { SFAuthManager } from 'snjs';

type Props = {
  contentType: string;
  onTagSelect: (tag: string) => void;
  navigation: any;
  selectedTags: any[];
  emptyPlaceholder?: string;
  hasBottomPadding?: boolean;
};

type State = {
  actionSheet: JSX.Element | null;
  tags: any[];
};

class TagSelectionList extends ThemedComponent<Props, State> {
  styles!: Record<string, ViewStyle | TextStyle>;
  handledDataLoad: any;
  signoutObserver: any;
  syncObserverId: string | undefined;
  syncEventHandler: any;
  /*
    @param props.selectedTags
    @param props.onTagSelect
  */

  constructor(props: Readonly<Props>) {
    super(props);
    this.state = { tags: [], actionSheet: null };
  }

  componentDidMount() {
    let handleInitialDataLoad = () => {
      if (this.handledDataLoad) {
        return;
      }
      this.handledDataLoad = true;
      this.reload();
    };

    this.reload();

    this.signoutObserver = Auth.get().addEventHandler((event: any) => {
      if (event === SFAuthManager.DidSignOutEvent) {
        this.reload();
      }
    });

    this.syncObserverId = `${Math.random()}`;

    ModelManager.get().addItemSyncObserver(
      this.syncObserverId,
      this.props.contentType,
      () => {
        this.reload();
      }
    );

    this.syncEventHandler = Sync.get().addEventHandler((event: string) => {
      if (event === 'local-data-loaded') {
        handleInitialDataLoad();
      }
    });
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    ModelManager.get().removeItemSyncObserver(this.syncObserverId);
    Sync.get().removeEventHandler(this.syncEventHandler);
    Auth.get().removeEventHandler(this.signoutObserver);
  }

  reload = () => {
    let tags;
    if (this.props.contentType === 'Tag') {
      tags = ModelManager.get().tags.slice();
    } else {
      tags = ModelManager.get().getSmartTags();
    }
    this.setState({ tags: tags });
  };

  /*
  Tag Options
  */

  onTagSelect = (tag: string) => {
    this.props.onTagSelect(tag);
  };

  showActionSheet = (tag: {
    content: any;
    title: any;
    setDirty: any;
    displayName: string;
    setAppDataItem: (arg0: string, arg1: boolean) => void;
    text: string;
  }) => {
    if (tag.content.isSystemTag) {
      return;
    }

    let sheet = new ActionSheetWrapper({
      title: tag.title,
      options: [
        ActionSheetWrapper.BuildOption({
          text: 'Rename',
          callback: () => {
            this.props.navigation.navigate(SCREEN_INPUT_MODAL, {
              title: 'Rename Tag',
              placeholder: 'Tag name',
              initialValue: tag.title,
              onSubmit: (text: string) => {
                if (tag) {
                  tag.title = text; // Update the text on the tag to the input text
                  tag.setDirty(true);
                  Sync.get().sync();
                  this.forceUpdate();
                }
              }
            });
          }
        }),
        ActionSheetWrapper.BuildOption({
          text: 'Delete',
          destructive: true,
          callback: () => {
            ItemActionManager.handleEvent(
              ItemActionManager.DeleteEvent,
              tag,
              () => {
                this.reload();
              }
            );
          }
        })
      ],
      onCancel: () => {
        this.setState({ actionSheet: null });
      }
    });

    this.setState({ actionSheet: sheet.actionSheetElement() });
    this.forceUpdate(); // required to get actionSheet ref
    sheet.show();
  };

  iconDescriptorForTag = () => {
    return {
      type: 'ascii',
      value: '#'
    };
  };

  // must pass title, text, and tags as props so that it re-renders when either of those change
  renderTagCell = ({ item }: any) => {
    let title = item.deleted ? 'Deleting...' : item.title;
    if (item.errorDecrypting) {
      title = 'Unable to Decrypt';
    }
    return (
      <View>
        <SideMenuCell
          onSelect={() => {
            this.onTagSelect(item);
          }}
          onLongPress={() => this.showActionSheet(item)}
          text={title}
          iconDesc={this.iconDescriptorForTag()}
          key={item.uuid}
          selected={this.props.selectedTags.includes(item)}
        />
      </View>
    );
  };

  render() {
    return (
      <Fragment>
        <FlatList
          style={this.styles.list}
          initialNumToRender={10}
          windowSize={10}
          maxToRenderPerBatch={10}
          data={this.state.tags}
          renderItem={this.renderTagCell}
          extraData={
            /* Required to force list cells to update on selection change */
            this.props.selectedTags
          }
        />

        {this.state.tags.length === 0 && (
          <Text style={this.styles.emptyPlaceholderText}>
            {this.props.emptyPlaceholder}
          </Text>
        )}

        {this.state.actionSheet && this.state.actionSheet}
      </Fragment>
    );
  }

  loadStyles() {
    this.styles = {
      list: {
        paddingBottom: this.props.hasBottomPadding ? 30 : 0
      },
      emptyPlaceholderText: {
        color: StyleKit.variables.stylekitForegroundColor,
        opacity: 0.6,
        paddingRight: 30,
        lineHeight: 18
      }
    };
  }
}

export default withNavigation(TagSelectionList);

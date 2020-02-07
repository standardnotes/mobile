import React, { Fragment } from 'react';
import { View, FlatList } from 'react-native';
import FAB from 'react-native-fab';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-navigation';
import LockedView from '@Containers/LockedView';
import ApplicationState from '@Lib/ApplicationState';
import { SCREEN_SETTINGS } from '@Screens/screens';
import AbstractSideMenu from '@SideMenu/AbstractSideMenu';
import SideMenuHero from '@SideMenu/SideMenuHero';
import SideMenuManager from '@SideMenu/SideMenuManager';
import SideMenuSection from '@SideMenu/SideMenuSection';
import TagSelectionList from '@SideMenu/TagSelectionList';
import AlertManager from '@SFJS/alertManager';
import Auth from '@SFJS/authManager';
import Sync from '@SFJS/syncManager';
import { ICON_BRUSH, ICON_SETTINGS } from '@Style/icons';
import ActionSheetWrapper from '@Style/ActionSheetWrapper';
import StyleKit from '@Style/StyleKit';
import ThemeManager from '@Style/ThemeManager';
import { LIGHT_MODE_KEY, DARK_MODE_KEY } from '@Style/utils';

export default class MainSideMenu extends AbstractSideMenu {
  constructor(props) {
    super(props);
    this.constructState({});

    this.signoutObserver = Auth.get().addEventHandler(event => {
      if (event === SFAuthManager.DidSignOutEvent) {
        this.setState({ outOfSync: false });
        this.forceUpdate();
      }
    });

    this.syncEventHandler = Sync.get().addEventHandler((event, data) => {
      if (event === 'enter-out-of-sync') {
        this.setState({ outOfSync: true });
      } else if (event === 'exit-out-of-sync') {
        this.setState({ outOfSync: false });
      }
    });
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    Auth.get().removeEventHandler(this.signoutObserver);
    Sync.get().removeEventHandler(this.syncEventHandler);
  }

  presentSettings() {
    this.props.navigation.navigate(SCREEN_SETTINGS);
  }

  outOfSyncPressed() {
    AlertManager.get().confirm({
      title: 'Potentially Out of Sync',
      text: "We've detected that the data in the current application session may not match the data on the server. This can happen due to poor network conditions, or if a large note fails to download on your device. To resolve this issue, we recommend first creating a backup of your data in the Settings screen, the signing out of your account and signing back in.",
      confirmButtonText: 'Open Settings',
      onConfirm: () => {
        this.presentSettings();
      }
    });
  }

  get handler() {
    return SideMenuManager.get().getHandlerForLeftSideMenu();
  }

  onTagSelect = tag => {
    this.handler.onTagSelect(tag);
    this.forceUpdate();
  };

  onThemeSelect = theme => {
    /** Prevent themes that aren't meant for mobile from being activated. */
    if (theme.content.package_info && theme.content.package_info.no_mobile) {
      AlertManager.get().alert({
        title: 'Not Available',
        text: 'This theme is not available on mobile.'
      });

      return;
    }

    const mode = StyleKit.doesDeviceSupportDarkMode()
      ? StyleKit.get().currentDarkMode
      : LIGHT_MODE_KEY;

    StyleKit.get().assignThemeForMode({ theme: theme, mode: mode });
    this.forceUpdate();
  };

  onThemeLongPress = theme => {
    const actionSheetOptions = [];

    /**
     * If this theme is a mobile theme, allow it to be set as the preferred
     * option for light/dark mode.
     */
    if (theme.content.package_info && !theme.content.package_info.no_mobile) {
      const lightThemeAction = this.getModeActionForTheme({
        theme: theme,
        mode: LIGHT_MODE_KEY
      });
      const lightName = StyleKit.doesDeviceSupportDarkMode()
        ? 'Light'
        : 'Active';
      const lightText = `${lightThemeAction} ${lightName} Theme`;

      actionSheetOptions.push(
        ActionSheetWrapper.BuildOption({
          text: lightText,
          callback: () => {
            StyleKit.get().assignThemeForMode({
              theme: theme,
              mode: LIGHT_MODE_KEY
            });
          }
        })
      );

      /** Only display a dark mode option if this device supports dark/light. */
      if (StyleKit.doesDeviceSupportDarkMode()) {
        const darkText = `${this.getModeActionForTheme({
          theme: theme,
          mode: DARK_MODE_KEY
        })} Dark Theme`;

        actionSheetOptions.push(
          ActionSheetWrapper.BuildOption({
            text: darkText,
            callback: () => {
              StyleKit.get().assignThemeForMode({
                theme: theme,
                mode: DARK_MODE_KEY
              });
            }
          })
        );
      }
    }

    /** System themes cannot be redownloaded. */
    if (!theme.content.isSystemTheme) {
      actionSheetOptions.push(
        ActionSheetWrapper.BuildOption({
          text: 'Redownload',
          callback: () => {
            this.onThemeRedownload(theme);
          }
        })
      );
    }

    const sheet = new ActionSheetWrapper({
      title: `${theme.name} Options`,
      options: actionSheetOptions,
      onCancel: () => {
        this.setState({ actionSheet: null });
      }
    });

    this.setState({ actionSheet: sheet.actionSheetElement() });
    this.forceUpdate(); // required to get actionSheet ref
    sheet.show();
  };

  onThemeRedownload(theme) {
    AlertManager.get().confirm({
      title: 'Redownload Theme',
      text: 'Themes are cached when downloaded. To retrieve the latest version, press Redownload.',
      confirmButtonText: 'Redownload',
      onConfirm: () => {
        StyleKit.get().downloadThemeAndReload(theme);
      }
    });
  }

  getModeActionForTheme({ theme, mode }) {
    return ThemeManager.get().isThemeEnabledForMode({
      mode: mode,
      theme: theme
    })
      ? 'Current'
      : 'Set as';
  }

  iconDescriptorForTheme = theme => {
    const desc = {
      type: 'circle',
      side: 'right'
    };

    const dockIcon =
      theme.content.package_info && theme.content.package_info.dock_icon;

    if (dockIcon && dockIcon.type === 'circle') {
      _.merge(desc, {
        backgroundColor: dockIcon.background_color,
        borderColor: dockIcon.border_color
      });
    } else {
      _.merge(desc, {
        backgroundColor: StyleKit.variables.stylekitInfoColor,
        borderColor: StyleKit.variables.stylekitInfoColor
      });
    }

    return desc;
  };

  buildOptionsForThemes() {
    const themes = StyleKit.get().themes();
    const options = [];
    for (const theme of themes) {
      const dimmed =
        theme.getNotAvailOnMobile() ||
        (theme.content.package_info && theme.content.package_info.no_mobile);
      const option = SideMenuSection.BuildOption({
        text: theme.name,
        key: theme.uuid || theme.name,
        iconDesc: this.iconDescriptorForTheme(theme),
        dimmed: dimmed,
        selected: StyleKit.get().isThemeActive(theme),
        onSelect: () => {
          this.onThemeSelect(theme);
        },
        onLongPress: () => {
          this.onThemeLongPress(theme);
        }
      });

      options.push(option);
    }

    if (themes.length === StyleKit.get().systemThemes.length) {
      options.push(
        SideMenuSection.BuildOption({
          text: 'Get More Themes',
          key: 'get-theme',
          iconDesc: {
            type: 'icon',
            name: StyleKit.nameForIcon(ICON_BRUSH),
            side: 'right',
            size: 17
          },
          onSelect: () => {
            ApplicationState.openURL('https://standardnotes.org/extensions');
          }
        })
      );
    }

    return options;
  }

  render() {
    const viewStyles = [StyleKit.styles.container, this.styles.sideMenu];

    if (this.state.lockContent) {
      return <LockedView style={viewStyles} />;
    }

    if (!this.handler || SideMenuManager.get().isLeftSideMenuLocked()) {
      /** Return empty, but colored view. */
      return <View style={viewStyles} />;
    }

    const themeOptions = this.buildOptionsForThemes();
    const selectedTags = this.handler.getSelectedTags();

    const sideMenuComponents = [
      <SideMenuSection
        title="Themes"
        key="themes-section"
        options={themeOptions}
        collapsed={true}
      />,

      <SideMenuSection title="Views" key="views-section">
        <TagSelectionList
          key="views-section-list"
          contentType="SN|SmartTag"
          onTagSelect={this.onTagSelect}
          selectedTags={selectedTags}
        />
      </SideMenuSection>,

      <SideMenuSection title="Tags" key="tags-section">
        <TagSelectionList
          key="tags-section-list"
          hasBottomPadding={ApplicationState.isAndroid}
          emptyPlaceholder={'No tags. Create one from the note composer.'}
          contentType="Tag"
          onTagSelect={this.onTagSelect}
          selectedTags={selectedTags}
        />
      </SideMenuSection>
    ];

    return (
      <Fragment>
        <SafeAreaView style={this.styles.firstSafeArea} />
        <SafeAreaView
          forceInset={{
            top: 'never',
            bottom: 'always',
            left: 'always',
            right: 'never'
          }}
          style={[viewStyles, this.styles.secondSafeArea]}
        >
          <SideMenuHero
            outOfSync={this.state.outOfSync}
            onPress={() => {
              this.presentSettings();
            }}
            onOutOfSyncPress={() => {
              this.outOfSyncPressed();
            }}
          />

          <FlatList
            style={this.styles.flatList}
            data={sideMenuComponents}
            renderItem={({ item }) => item}
          />

          <FAB
            buttonColor={StyleKit.variables.stylekitInfoColor}
            iconTextColor={StyleKit.variables.stylekitInfoContrastColor}
            onClickAction={() => {
              this.presentSettings();
            }}
            visible={true}
            size={29}
            paddingTop={ApplicationState.isIOS ? 2 : 0}
            iconTextComponent={
              <Icon name={StyleKit.nameForIcon(ICON_SETTINGS)} />
            }
          />

          {this.state.actionSheet && this.state.actionSheet}
        </SafeAreaView>
      </Fragment>
    );
  }

  loadStyles() {
    this.styles = {
      // We want top color to be different from bottom color of safe area.
      // See https://stackoverflow.com/questions/47725607/react-native-safeareaview-background-color-how-to-assign-two-different-backgro
      firstSafeArea: {
        flex: 0,
        backgroundColor: StyleKit.variables.stylekitContrastBackgroundColor
      },
      secondSafeArea: {
        flex: 1,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor
      },
      sideMenu: {
        // We want the header to be totally contrast, but content to be main
        // So we have to set top level to contrast and individual elements to main
        backgroundColor: StyleKit.variables.stylekitContrastBackgroundColor,
        color: StyleKit.variables.stylekitForegroundColor,
        flex: 1,
        flexDirection: 'column'
      },
      flatList: {
        padding: 15,
        flex: 1,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor
      }
    };
  }
}

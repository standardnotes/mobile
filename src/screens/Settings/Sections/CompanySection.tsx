import React, { Component } from 'react';
import { View, Text, Platform, Share } from 'react-native';
import ButtonCell from '@Components/ButtonCell';
import SectionHeader from '@Components/SectionHeader';
import TableSection from '@Components/TableSection';
import ApplicationState from '@Lib/ApplicationState';
import StyleKit from '@Style/StyleKit';

export default class CompanySection extends Component {
  onAction = (action) => {
    if (action === 'feedback') {
      const platformString = Platform.OS === 'android' ? 'Android' : 'iOS';
      ApplicationState.openURL(
        `mailto:help@standardnotes.org?subject=${platformString} app feedback (v${ApplicationState.version})`
      );
    } else if (action === 'learn_more') {
      ApplicationState.openURL('https://standardnotes.org');
    } else if (action === 'privacy') {
      ApplicationState.openURL('https://standardnotes.org/privacy');
    } else if (action === 'help') {
      ApplicationState.openURL('https://standardnotes.org/help');
    } else if (action === 'rate') {
      if (ApplicationState.isIOS) {
        ApplicationState.openURL(
          'https://itunes.apple.com/us/app/standard-notes/id1285392450?ls=1&mt=8'
        );
      } else {
        ApplicationState.openURL('market://details?id=com.standardnotes');
      }
    } else if (action === 'friend') {
      let title = 'Standard Notes';
      let message =
        'Check out Standard Notes, a free, open-source, and completely encrypted notes app.';
      let url = 'https://standardnotes.org';
      // Android ignores url. iOS ignores title.
      if (ApplicationState.isAndroid) {
        message += '\n\nhttps://standardnotes.org';
      }

      ApplicationState.get().performActionWithoutStateChangeImpact(() => {
        Share.share({ title: title, message: message, url: url });
      });
    } else if (action === 'spread-encryption') {
      let title = 'The Unexpected Benefits of Encrypted Writing';
      let message = ApplicationState.isIOS ? title : '';
      let url = 'https://standardnotes.org/why-encrypted';
      // Android ignores url. iOS ignores title.
      if (ApplicationState.isAndroid) {
        message += '\n\nhttps://standardnotes.org/why-encrypted';
      }

      ApplicationState.get().performActionWithoutStateChangeImpact(() => {
        Share.share({ title: title, message: message, url: url });
      });
    }
  };

  render() {
    const storeName = Platform.OS === 'android' ? 'Play Store' : 'App Store';
    return (
      <TableSection>
        <SectionHeader title={this.props.title} />

        <ButtonCell
          first={true}
          leftAligned={true}
          title="Help"
          onPress={() => this.onAction('help')}
        >
          <Text
            style={{
              color: StyleKit.variables.stylekitNeutralColor,
              marginTop: 3
            }}
          >
            https://standardnotes.org/help
          </Text>
        </ButtonCell>

        <ButtonCell
          leftAligned={true}
          title="Contact Support"
          onPress={() => this.onAction('feedback')}
        >
          <View style={{ display: 'flex', flexDirection: 'column' }}>
            <Text
              style={{
                color: StyleKit.variables.stylekitNeutralColor,
                marginTop: 3
              }}
            >
              help@standardnotes.org
            </Text>
          </View>
        </ButtonCell>

        <ButtonCell
          leftAligned={true}
          title="Spread Encryption"
          onPress={() => this.onAction('spread-encryption')}
        >
          <Text
            style={{
              color: StyleKit.variables.stylekitNeutralColor,
              marginTop: 3
            }}
          >
            Share the unexpected benefits of encrypted writing.
          </Text>
        </ButtonCell>

        <ButtonCell
          leftAligned={true}
          title="Tell a Friend"
          onPress={() => this.onAction('friend')}
        >
          <Text
            style={{
              color: StyleKit.variables.stylekitNeutralColor,
              marginTop: 3
            }}
          >
            Share Standard Notes with a friend.
          </Text>
        </ButtonCell>

        <ButtonCell
          leftAligned={true}
          title="Learn About Standard Notes"
          onPress={() => this.onAction('learn_more')}
        >
          <Text
            style={{
              color: StyleKit.variables.stylekitNeutralColor,
              marginTop: 3
            }}
          >
            https://standardnotes.org
          </Text>
        </ButtonCell>

        <ButtonCell
          leftAligned={true}
          title="Our Privacy Manifesto"
          onPress={() => this.onAction('privacy')}
        >
          <Text
            style={{
              color: StyleKit.variables.stylekitNeutralColor,
              marginTop: 3
            }}
          >
            https://standardnotes.org/privacy
          </Text>
        </ButtonCell>

        <ButtonCell
          last={true}
          leftAligned={true}
          title="Rate Standard Notes"
          onPress={() => this.onAction('rate')}
        >
          <View style={{ display: 'flex', flexDirection: 'column' }}>
            <Text
              style={{
                color: StyleKit.variables.stylekitNeutralColor,
                marginTop: 3
              }}
            >
              Version {ApplicationState.version}
            </Text>
            <Text
              style={{
                color: StyleKit.variables.stylekitNeutralColor,
                marginTop: 3
              }}
            >
              Help support us with a review on the {storeName}.
            </Text>
          </View>
        </ButtonCell>
      </TableSection>
    );
  }
}

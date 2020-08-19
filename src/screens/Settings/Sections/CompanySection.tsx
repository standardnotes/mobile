import { ButtonCell } from '@Components/ButtonCell';
import { SectionHeader } from '@Components/SectionHeader';
import { TableSection } from '@Components/TableSection';
import { ApplicationState } from '@Lib/ApplicationState';
import { ApplicationContext } from '@Root/ApplicationContext';
import React, { useContext } from 'react';
import { Platform, Share } from 'react-native';
import { ContentContainer, Label } from './CompanySection.styled';

const URLS = {
  feedback: `mailto:help@standardnotes.org?subject=${
    Platform.OS === 'android' ? 'Android' : 'iOS'
  } app feedback (v${ApplicationState.version})`,
  learn_more: 'https://standardnotes.org',
  privacy: 'https://standardnotes.org/privacy',
  help: 'https://standardnotes.org/help',
  rate: Platform.select({
    ios:
      'https://itunes.apple.com/us/app/standard-notes/id1285392450?ls=1&mt=8',
    android: 'market://details?id=com.standardnotes',
  }) as string,
};

type Props = {
  title: string;
};

export const CompanySection = (props: Props) => {
  const application = useContext(ApplicationContext);
  const storeName = Platform.OS === 'android' ? 'Play Store' : 'App Store';

  const openUrl = (action: keyof typeof URLS) => {
    application?.deviceInterface!.openUrl(URLS[action]);
  };

  const shareEncryption = () => {
    const title = 'The Unexpected Benefits of Encrypted Writing';
    let message = Platform.OS === 'ios' ? title : '';
    const url = 'https://standardnotes.org/why-encrypted';
    // Android ignores url. iOS ignores title.
    if (Platform.OS === 'android') {
      message += '\n\nhttps://standardnotes.org/why-encrypted';
    }
    application?.getAppState().performActionWithoutStateChangeImpact(() => {
      Share.share({ title: title, message: message, url: url });
    });
  };

  const shareWithFriend = () => {
    const title = 'Standard Notes';
    let message =
      'Check out Standard Notes, a free, open-source, and completely encrypted notes app.';
    const url = 'https://standardnotes.org';
    // Android ignores url. iOS ignores title.
    if (Platform.OS === 'android') {
      message += '\n\nhttps://standardnotes.org';
    }
    application?.getAppState().performActionWithoutStateChangeImpact(() => {
      Share.share({ title: title, message: message, url: url });
    });
  };

  return (
    <TableSection>
      <SectionHeader title={props.title} />

      <ButtonCell
        first
        leftAligned={true}
        title="Help"
        onPress={() => openUrl('help')}
      >
        <Label>https://standardnotes.org/help</Label>
      </ButtonCell>
      <ButtonCell
        leftAligned={true}
        title="Contact Support"
        onPress={() => openUrl('feedback')}
      >
        <ContentContainer>
          <Label>help@standardnotes.org</Label>
        </ContentContainer>
      </ButtonCell>

      <ButtonCell
        leftAligned={true}
        title="Spread Encryption"
        onPress={shareEncryption}
      >
        <Label>Share the unexpected benefits of encrypted writing.</Label>
      </ButtonCell>

      <ButtonCell
        leftAligned={true}
        title="Tell a Friend"
        onPress={shareWithFriend}
      >
        <Label>Share Standard Notes with a friend.</Label>
      </ButtonCell>

      <ButtonCell
        leftAligned={true}
        title="Learn About Standard Notes"
        onPress={() => openUrl('learn_more')}
      >
        <Label>https://standardnotes.org</Label>
      </ButtonCell>

      <ButtonCell
        leftAligned={true}
        title="Our Privacy Manifesto"
        onPress={() => openUrl('privacy')}
      >
        <Label>https://standardnotes.org/privacy</Label>
      </ButtonCell>

      <ButtonCell
        leftAligned={true}
        title="Rate Standard Notes"
        onPress={() => openUrl('rate')}
      >
        <ContentContainer>
          <Label>Version {ApplicationState.version}</Label>
          <Label>Help support us with a review on the {storeName}.</Label>
        </ContentContainer>
      </ButtonCell>
    </TableSection>
  );
};

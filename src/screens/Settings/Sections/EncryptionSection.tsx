import React, { useContext, useMemo } from 'react';
import {
  BaseView,
  Title,
  Subtitle,
  StyledSectionedTableCell,
} from './EncryptionSection.styled';
import { TableSection } from '@Components/TableSection';
import { SectionHeader } from '@Components/SectionHeader';
import { ApplicationContext } from '@Root/ApplicationContext';
import { StorageEncryptionPolicies, ContentType } from 'snjs';

type Props = {
  title: string;
  encryptionAvailable: boolean;
};

export const EncryptionSection = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext);

  const textData = useMemo(() => {
    const encryptionType = application?.getProtocolEncryptionDisplayName();
    let encryptionStatus = props.encryptionAvailable ? 'Enabled' : 'Not Enabled';
    if (props.encryptionAvailable) {
      encryptionStatus += ` | ${encryptionType}`;
    } else {
      encryptionStatus += '. '; // to connect sentence
      encryptionStatus +=
        application?.getStorageEncryptionPolicy() ===
        StorageEncryptionPolicies.Default
          ? 'To enable encryption, sign in, register, or enable storage encryption.'
          : 'Sign in, register, or add a local passcode to enable encryption.';
    }
    const sourceString = application?.getUser() ? 'Account Keys' : 'Passcode';

    const items = application!.getItems([ContentType.Note, ContentType.Tag]);
    const itemsStatus =
      items.length + '/' + items.length + ' notes and tags encrypted';

    return {
      encryptionStatus,
      sourceString,
      itemsStatus,
    };
  }, [props.encryptionAvailable]);

  return (
    <TableSection>
      <SectionHeader title={props.title} />

      <StyledSectionedTableCell last={!props.encryptionAvailable} first={true}>
        <BaseView>
          <Title>Encryption</Title>
          <Subtitle>{textData.encryptionStatus}</Subtitle>
        </BaseView>
      </StyledSectionedTableCell>

      {props.encryptionAvailable && (
        <StyledSectionedTableCell>
          <BaseView>
            <Title>Encryption Source</Title>
            <Subtitle>{textData.sourceString}</Subtitle>
          </BaseView>
        </StyledSectionedTableCell>
      )}

      {props.encryptionAvailable && (
        <StyledSectionedTableCell last>
          <BaseView>
            <Title>Items Encrypted</Title>
            <Subtitle>{textData.itemsStatus}</Subtitle>
          </BaseView>
        </StyledSectionedTableCell>
      )}
    </TableSection>
  );
};

import React, { useState, useContext, useEffect, useMemo } from 'react';
import {
  BaseView,
  Title,
  Subtitle,
  StyledSectionedTableCell,
} from './EncryptionSection.styled';
import { TableSection } from '@Components/TableSection';
import { SectionHeader } from '@Components/SectionHeader';
import { SectionedTableCell } from '@Components/SectionedTableCell';
import { ApplicationContext } from '@Root/ApplicationContext';
import { StorageEncryptionPolicies, ContentType } from 'snjs';

type Props = {
  title: string;
};

export const EncryptionSection = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [encryptionAvailable, setEncryptionAvailable] = useState(false);

  useEffect(() => {
    const getEncryptionAvailable = async () => {
      setEncryptionAvailable(
        Boolean(await application?.isEncryptionAvailable())
      );
    };
    getEncryptionAvailable();
  }, [application]);

  const textData = useMemo(() => {
    const encryptionType = 'AES-256';
    let encryptionStatus = encryptionAvailable ? 'Enabled' : 'Not Enabled';
    if (encryptionAvailable) {
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
  }, [application, encryptionAvailable]);

  return (
    <TableSection>
      <SectionHeader title={props.title} />

      <StyledSectionedTableCell last={!encryptionAvailable} first={true}>
        <BaseView>
          <Title>Encryption</Title>
          <Subtitle>{textData.encryptionStatus}</Subtitle>
        </BaseView>
      </StyledSectionedTableCell>

      {encryptionAvailable && (
        <StyledSectionedTableCell>
          <BaseView>
            <Title>Encryption Source</Title>
            <Subtitle>{textData.sourceString}</Subtitle>
          </BaseView>
        </StyledSectionedTableCell>
      )}

      {encryptionAvailable && (
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

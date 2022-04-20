import { ButtonCell } from '@Components/ButtonCell'
import { SectionHeader } from '@Components/SectionHeader'
import { TableSection } from '@Components/TableSection'
import { useProtectionSessionExpiry } from '@Lib/snjs_helper_hooks'
import { useSafeApplicationContext } from '@Root/hooks/useSafeApplicationContext'
import React from 'react'
import {
  BaseView,
  StyledSectionedTableCell,
  SubText,
  Subtitle,
  Title,
} from './ProtectionsSection.styled'

type Props = {
  title: string
  protectionsAvailable?: boolean
}

export const ProtectionsSection = (props: Props) => {
  // Context
  const application = useSafeApplicationContext()
  // State
  const [protectionsDisabledUntil] = useProtectionSessionExpiry()

  const protectionsEnabledSubtitle = protectionsDisabledUntil
    ? `Disabled until ${protectionsDisabledUntil}`
    : 'Enabled'

  const protectionsEnabledSubtext =
    'Actions like viewing protected notes, exporting decrypted backups, or revoking an active session, require additional authentication like entering your account password or application passcode.'

  const enableProtections = () => {
    void application?.clearProtectionSession()
  }

  return (
    <TableSection>
      <SectionHeader title={props.title} />
      <StyledSectionedTableCell first>
        <BaseView>
          <Title>Status</Title>
          <Subtitle>
            {props.protectionsAvailable
              ? protectionsEnabledSubtitle
              : 'Disabled'}
          </Subtitle>
        </BaseView>
      </StyledSectionedTableCell>
      {props.protectionsAvailable && protectionsDisabledUntil && (
        <ButtonCell
          leftAligned
          title={'Enable Protections'}
          onPress={enableProtections}
        />
      )}
      <SubText>{protectionsEnabledSubtext}</SubText>
    </TableSection>
  )
}

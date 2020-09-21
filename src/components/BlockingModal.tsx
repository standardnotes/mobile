import { ModalStackNavigationProp } from '@Root/App';
import { MODAL_BLOCKING_ALERT } from '@Screens/screens';
import React from 'react';
import { Container, Content, Subtitle, Title } from './BlockingModal.styled';

type Props = ModalStackNavigationProp<typeof MODAL_BLOCKING_ALERT>;

export const BlockingModal = ({ route: { params } }: Props) => {
  return (
    <Container>
      <Content>
        {params.title && <Title>{params.title}</Title>}
        <Subtitle>{params.text}</Subtitle>
      </Content>
    </Container>
  );
};

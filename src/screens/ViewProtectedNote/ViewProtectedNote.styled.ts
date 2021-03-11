import styled from 'styled-components/native';

export const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }) =>
    theme.stylekitSecondaryContrastBackgroundColor};
  display; flex;
  justify-content: center;
  padding: 20px;
`;

export const Title = styled.Text`
  font-size: 18px;
  text-align: center;
  color: ${({ theme }) => theme.stylekitParagraphTextColor};
  margin-bottom: 16px;
`;

export const Text = styled.Text`
  margin: 16px 0;
  font-size: 16px;
  text-align: center;
  color: ${({ theme }) => theme.stylekitNeutralColor};
`;

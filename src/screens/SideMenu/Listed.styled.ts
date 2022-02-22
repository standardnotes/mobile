import { hexToRGBA } from '@Style/utils';
import { StyleSheet } from 'react-native';
import styled from 'styled-components/native';

export const styles = StyleSheet.create({
  createBlogButton: {
    fontSize: 12,
  },
});
export const CreateBlogContainer = styled.View`
  border-top-color: ${({ theme }) =>
    hexToRGBA(theme.stylekitBorderColor, 0.75)};
  border-top-width: 1px;
  margin-bottom: 8px;
`;
export const LearnMore = styled.Text`
  font-size: 12px;
  opacity: 0.7;
  margin-top: -5px;
  margin-left: 6px;
  color: ${({ theme }) => theme.stylekitContrastForegroundColor};
`;

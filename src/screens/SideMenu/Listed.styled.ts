import { StyleSheet } from 'react-native';
import styled from 'styled-components/native';

export const styles = StyleSheet.create({
  blogItemIcon: {
    marginTop: -6,
  },
});
export const CreateBlogContainer = styled.View`
  margin-bottom: 8px;
`;
export const CantLoadActionsText = styled.Text`
  font-size: 12px;
  margin-top: -12px;
  margin-bottom: 10px;
  opacity: 0.7;
  color: ${({ theme }) => theme.stylekitContrastForegroundColor};
`;
export const ListedItemRow = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

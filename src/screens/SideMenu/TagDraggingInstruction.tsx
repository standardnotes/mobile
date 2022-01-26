import { SNTag } from '@standardnotes/snjs/dist/@types';
import React from 'react';
import { View } from 'react-native';
import { Text, Touchable } from './SideMenuCell.styled';

type Props = {
  dragging: SNTag;
  onUnset: () => void;
};

export const TagDraggingInstructions: React.FC<Props> = React.memo(
  ({ dragging, onUnset }) => {
    return (
      <View>
        <Text>Tap any other tag to move {dragging.title} there.</Text>
        <Touchable isSubtext={false} onPress={onUnset}>
          <Text>Tap here to move it out of any folder.</Text>
        </Touchable>
      </View>
    );
  }
);

import { Icon, IconType } from '@Components/Icon';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import styled, { css } from 'styled-components/native';

export type BottomSheetActionType = {
  text: string;
  key: string;
  iconType?: IconType;
  callback?: () => Promise<void> | void;
  danger?: boolean;
  centered?: boolean;
  description?: string;
  dismissSheetOnPress?: boolean;
};

export type BottomSheetDefaultSectionType = {
  expandable: false;
  key: string;
  actions: BottomSheetActionType[];
};

export type BottomSheetExpandableSectionType = {
  expandable: true;
  key: string;
  actions: BottomSheetActionType[];
  text: string;
  iconType?: IconType;
  description?: string;
};

export type BottomSheetSectionType =
  | BottomSheetDefaultSectionType
  | BottomSheetExpandableSectionType;

type Props = {
  sections: BottomSheetSectionType[];
  title?: string;
  bottomSheetRef: React.RefObject<BottomSheetModal>;
};

const HandleContainer = styled.View`
  background-color: transparent;
  display: flex;
  align-items: center;
  border-radius: 0;
  margin-top: -13px;
`;

const Handle = styled.View`
  background-color: #bbbec4;
  height: 5px;
  width: 44px;
  border-radius: 100px;
`;

const BottomSheetContent = styled.View`
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
  display: flex;
`;

const TitleContainer = styled.View`
  padding: 20px;
  border-bottom-width: 1px;
  border-color: ${({ theme }) => theme.stylekitBorderColor};
`;

const Title = styled.Text`
  font-weight: ${Platform.OS === 'ios' ? 600 : 'bold'};
  font-size: 16px;
  color: ${({ theme }) => theme.stylekitForegroundColor};
`;

const SectionContainer = styled.View<{ stackIndex: number }>`
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
  z-index: ${({ stackIndex }) => stackIndex};
`;

const SectionSeparatorContainer = styled.View`
  z-index: 2;
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
`;

const SectionSeparator = styled.View<{ first?: boolean }>`
  ${({ first }) =>
    first
      ? css`
          margin-bottom: 8px;
        `
      : css`
          height: 1px;
          background-color: ${({ theme }) => theme.stylekitBorderColor};
          margin: 8px 0 8px 56px;
        `};
`;

const ExpandableSectionContainer = styled.View`
  background-color: white;
  z-index: 2;
`;

const ActionsContainer = styled.View``;

const BottomSheetItemContainer = styled.TouchableOpacity`
  padding: 10px 16px;
`;

const ItemMainInfo = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const ItemIconContainer = styled.View`
  height: 24px;
  width: 24px;
  display: flex;
  margin-right: 16px;
  justify-content: center;
`;

const ItemIcon = styled(Icon).attrs(({ theme }) => ({
  color: theme.stylekitNeutralColor,
}))`
  text-align: center;
`;

const ItemText = styled.Text<{ danger?: boolean; centered?: boolean }>`
  color: ${({ theme, danger }) =>
    danger ? theme.stylekitDangerColor : theme.stylekitForegroundColor};
  font-size: 16px;
  margin-right: ${({ centered }) => (centered ? 0 : '16px')};
  text-align: ${({ centered }) => (centered ? 'center' : 'left')};
`;

const ItemDescription = styled.Text`
  color: ${({ theme }) => theme.stylekitNeutralColor};
  font-size: 14px;
  margin-top: 2px;
  margin-left: 40px;
`;

const ActionContainer = styled.View`
  display: flex;
  flex-direction: row;
`;

const LoadingIndicator = styled.ActivityIndicator.attrs(({ theme }) => ({
  color: theme.stylekitInfoColor,
}))`
  margin-left: auto;
  margin-right: 16px;
`;

const HandleComponent: React.FC = () => (
  <HandleContainer>
    <Handle />
  </HandleContainer>
);

const Item: React.FC<{
  text: string;
  onPress: () => void;
  iconType?: IconType;
  description?: string;
  centered?: boolean;
  danger?: boolean;
}> = ({ text, onPress, iconType, description, centered, danger }) => {
  return (
    <BottomSheetItemContainer onPress={onPress}>
      <ItemMainInfo>
        {centered ? null : (
          <ItemIconContainer>
            {iconType ? <ItemIcon type={iconType} size={24} /> : null}
          </ItemIconContainer>
        )}
        <ItemText danger={danger} centered={centered}>
          {text}
        </ItemText>
      </ItemMainInfo>
      {description && <ItemDescription>{description}</ItemDescription>}
    </BottomSheetItemContainer>
  );
};

const ExpandableSectionItem: React.FC<{
  section: BottomSheetExpandableSectionType;
  expandSection: () => void;
}> = ({ section, expandSection }) => (
  <Item
    text={section.text}
    onPress={expandSection}
    iconType={section.iconType}
    description={section.description}
  />
);

const ActionItem: React.FC<{
  action: BottomSheetActionType;
  dismissBottomSheet: () => void;
}> = ({ action, dismissBottomSheet }) => {
  const [loading, setLoading] = useState(false);

  const onPress = async () => {
    if (action.callback) {
      setLoading(true);
      await action.callback();
      setLoading(false);
    }
    if (action.dismissSheetOnPress) {
      dismissBottomSheet();
    }
  };

  return (
    <ActionContainer>
      <Item {...action} onPress={onPress} />
      {loading && <LoadingIndicator />}
    </ActionContainer>
  );
};

const Section: React.FC<{
  section: BottomSheetSectionType & { animationValue: Animated.Value };
  first: boolean;
  dismissBottomSheet: () => void;
  expandSection: () => void;
  stackIndex: number;
}> = ({ section, first, dismissBottomSheet, expandSection, stackIndex }) => {
  const [actionsContainerHeight, setActionsContainerHeight] = useState(0);

  const actionsContainerStyle = section.expandable
    ? {
        marginTop: section.animationValue.interpolate({
          inputRange: [0, 1],
          outputRange: [-actionsContainerHeight, 0],
        }),
        opacity: section.animationValue,
      }
    : {};

  const onActionsContainerLayout = (e: LayoutChangeEvent) => {
    setActionsContainerHeight(e.nativeEvent.layout.height);
  };

  return (
    <SectionContainer stackIndex={stackIndex}>
      <SectionSeparatorContainer>
        <SectionSeparator first={first} />
      </SectionSeparatorContainer>
      <>
        {section.expandable && (
          <ExpandableSectionContainer>
            <ExpandableSectionItem
              section={section}
              expandSection={expandSection}
            />
          </ExpandableSectionContainer>
        )}
        <ActionsContainer
          as={Animated.View}
          onLayout={onActionsContainerLayout}
          style={actionsContainerStyle}
        >
          {section.actions.map(action => (
            <ActionItem
              action={action}
              dismissBottomSheet={dismissBottomSheet}
            />
          ))}
        </ActionsContainer>
      </>
    </SectionContainer>
  );
};

export const BottomSheet: React.FC<Props> = ({
  bottomSheetRef,
  sections,
  title,
}) => {
  const [titleHeight, setTitleHeight] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const [expandedSectionKey, setExpandedSectionKey] = useState('');

  const animatedSections = useMemo(() => {
    return sections.map(section => {
      const expanded = section.key === expandedSectionKey;
      return {
        ...section,
        animationValue: new Animated.Value(expanded ? 1 : 0),
      };
    });
  }, [expandedSectionKey, sections]);

  useEffect(() => {
    if (!title) {
      setTitleHeight(0);
    }
  }, [title]);

  const onTitleLayout = (e: LayoutChangeEvent) => {
    setTitleHeight(e.nativeEvent.layout.height);
  };

  const onListLayout = (e: LayoutChangeEvent) => {
    setListHeight(e.nativeEvent.layout.height);
  };

  const contentHeight = useMemo(() => titleHeight + listHeight, [
    titleHeight,
    listHeight,
  ]);

  const snapPoints = useMemo(() => {
    const screenHeight = Dimensions.get('window').height;
    const maxLimit = 0.85 * screenHeight;

    if (contentHeight === 0) {
      return [1];
    }
    return contentHeight < maxLimit ? [contentHeight] : [maxLimit];
  }, [contentHeight]);

  const expandSection = (sectionKey: string) => {
    const animations: Animated.CompositeAnimation[] = [];
    animatedSections.forEach(section => {
      if (section.expandable) {
        animations.push(
          Animated.timing(section.animationValue, {
            toValue: sectionKey === section.key ? 1 : 0,
            duration: 250,
            useNativeDriver: false,
          })
        );
      }
    });
    Animated.parallel(animations).start(() =>
      setExpandedSectionKey(sectionKey)
    );
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      handleComponent={HandleComponent}
      backdropComponent={BottomSheetBackdrop}
    >
      <>
        {title ? (
          <TitleContainer onLayout={onTitleLayout}>
            <Title>{title}</Title>
          </TitleContainer>
        ) : null}
        <BottomSheetScrollView>
          <BottomSheetContent onLayout={onListLayout}>
            {animatedSections.map((section, index) => (
              <Section
                key={section.key}
                section={section}
                first={index === 0}
                dismissBottomSheet={() => bottomSheetRef?.current?.dismiss()}
                expandSection={() => expandSection(section.key)}
                stackIndex={sections.length - index}
              />
            ))}
          </BottomSheetContent>
        </BottomSheetScrollView>
      </>
    </BottomSheetModal>
  );
};

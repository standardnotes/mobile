import { Icon, IconType } from '@Components/Icon';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from '@gorhom/bottom-sheet';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import styled, { css } from 'styled-components/native';
import { SNSwitch } from './SNSwitch';

export type BottomSheetAction = {
  text: string;
  key: string;
  iconType?: IconType;
  callback?: () => Promise<void> | void;
  danger?: boolean;
  description?: string;
  dismissSheetOnPress?: boolean;
  switch?: {
    onValueChange: (value: boolean) => void;
    value: boolean;
  };
};

export type BottomSheetDefaultSectionType = {
  expandable: false;
  key: string;
  actions: BottomSheetAction[];
};

export type BottomSheetExpandableSectionType = {
  expandable: true;
  key: string;
  actions: BottomSheetAction[];
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

const styles = StyleSheet.create({
  itemMainInfo: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});

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
  flex: 1;
  padding: 8px 0 16px;
`;

const TitleContainer = styled.View`
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
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
    !first &&
    css`
      height: 1px;
      background-color: ${({ theme }) => theme.stylekitBorderColor};
      margin: 8px 0 8px 56px;
    `};
`;

const ExpandableSectionContainer = styled.View`
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
  z-index: 2;
`;

const ActionsContainer = styled.View``;

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
  width: 100%;
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

const Item: React.FC<
  Omit<BottomSheetAction, 'key' | 'callback'> & {
    onPress: () => void;
    disabled: boolean;
  }
> = props => {
  const children = (
    <>
      <ItemIconContainer>
        {props.iconType ? <ItemIcon type={props.iconType} size={24} /> : null}
      </ItemIconContainer>
      <ItemText danger={props.danger}>{props.text}</ItemText>
      <View style={{ flexGrow: 1 }} />
    </>
  );

  const switchProps = props.switch;

  return switchProps ? (
    Platform.OS === 'android' ? (
      /** Android switches are activated by pressing anywhere on the cell */
      <TouchableWithoutFeedback
        onPress={() => switchProps.onValueChange(!switchProps.value)}
        style={styles.itemContainer}
      >
        <View style={{ flexDirection: 'row' }}>
          {children}
          <SNSwitch value={switchProps.value} />
        </View>
      </TouchableWithoutFeedback>
    ) : (
      /** iOS switches are activated only by pressing the switch  */
      <View style={styles.itemContainer}>
        {children}
        <SNSwitch
          value={switchProps.value}
          onValueChange={switchProps.onValueChange}
        />
      </View>
    )
  ) : (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={props.onPress}
      disabled={props.disabled}
    >
      {children}
      {props.description && (
        <ItemDescription>{props.description}</ItemDescription>
      )}
    </TouchableOpacity>
  );
};

const ExpandableSectionItem: React.FC<{
  section: BottomSheetExpandableSectionType;
  expandSection: () => void;
  expanded: boolean;
}> = ({ section, expandSection, expanded }) => (
  <Item
    text={section.text}
    onPress={expandSection}
    iconType={section.iconType}
    description={section.description}
    disabled={section.actions.length === 0 || expanded}
  />
);

const ActionItem: React.FC<{
  action: BottomSheetAction;
  dismissBottomSheet: () => void;
}> = ({ action, dismissBottomSheet }) => {
  const [loading, setLoading] = useState(false);

  const onPress = async () => {
    if (action.dismissSheetOnPress) {
      dismissBottomSheet();
    }
    if (action.callback) {
      if (!action.dismissSheetOnPress) {
        setLoading(true);
      }
      await action.callback();
      if (!action.dismissSheetOnPress) {
        setLoading(false);
      }
    }
  };

  return (
    <ActionContainer>
      <Item
        {...action}
        onPress={onPress}
        disabled={loading || !action.callback}
      />
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
  expanded: boolean;
}> = ({
  section,
  first,
  dismissBottomSheet,
  expandSection,
  stackIndex,
  expanded,
}) => {
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
              expanded={expanded}
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
              key={action.key}
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
  const [shouldCollapseSections, setShouldCollapseSections] = useState(false);
  const { height: screenHeight } = useWindowDimensions();

  const animatedSections = useMemo(() => {
    return sections.map(section => {
      const expanded = section.key === expandedSectionKey;
      let animationValue = 0;
      if (expanded) {
        animationValue = shouldCollapseSections ? 0 : 1;
      }
      setShouldCollapseSections(false);
      return {
        ...section,
        animationValue: new Animated.Value(animationValue),
      };
    });
  }, [expandedSectionKey, sections, shouldCollapseSections]);

  useEffect(() => {
    if (!title) {
      setTitleHeight(0);
    }
  }, [title]);

  let snapPoints: number[];
  const contentHeight = titleHeight + listHeight;
  const maxLimit = 0.85 * screenHeight;
  if (contentHeight === 0) {
    snapPoints = [1];
  } else {
    snapPoints = contentHeight < maxLimit ? [contentHeight] : [maxLimit];
  }

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

  const onDismiss = () => {
    setExpandedSectionKey('');
    setShouldCollapseSections(true);
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      handleComponent={HandleComponent}
      backdropComponent={BottomSheetBackdrop}
      onDismiss={onDismiss}
      bottomInset={-24}
    >
      <>
        {title ? (
          <TitleContainer
            onLayout={(e: LayoutChangeEvent) => {
              setTitleHeight(e.nativeEvent.layout.height);
            }}
          >
            <Title>{title}</Title>
          </TitleContainer>
        ) : null}
        <BottomSheetScrollView>
          <BottomSheetContent
            onLayout={(e: LayoutChangeEvent) => {
              setListHeight(e.nativeEvent.layout.height);
            }}
          >
            {animatedSections.map((section, index) => (
              <Section
                key={section.key}
                section={section}
                first={index === 0}
                dismissBottomSheet={() => bottomSheetRef?.current?.dismiss()}
                expandSection={() => expandSection(section.key)}
                stackIndex={sections.length - index}
                expanded={section.key === expandedSectionKey}
              />
            ))}
          </BottomSheetContent>
        </BottomSheetScrollView>
      </>
    </BottomSheetModal>
  );
};

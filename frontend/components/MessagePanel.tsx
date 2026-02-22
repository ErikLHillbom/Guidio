import React, { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Message } from '../types';
import { BRAND_BLUE } from '../constants/colors';

const COLLAPSED_HEIGHT = 42;
const EXPANDED_HEIGHT = 408;
const SNAP_THRESHOLD = EXPANDED_HEIGHT / 3;

interface Props {
  messages: Message[];
}

function MessagePanel({ messages }: Props) {
  const height = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const currentHeight = useRef(COLLAPSED_HEIGHT);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const snapTo = (target: number) => {
    Animated.timing(height, {
      toValue: target,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    currentHeight.current = target;
    setExpanded(target === EXPANDED_HEIGHT);
  };

  const toggle = () => {
    snapTo(expanded ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        const next = Math.max(
          COLLAPSED_HEIGHT,
          Math.min(EXPANDED_HEIGHT, currentHeight.current + g.dy),
        );
        height.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const raw = Math.max(
          COLLAPSED_HEIGHT,
          currentHeight.current + g.dy,
        );
        snapTo(raw > SNAP_THRESHOLD ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT);
      },
    }),
  ).current;

  const scrollToEnd = () => {
    scrollRef.current?.scrollToEnd({ animated: false });
  };

  return (
    <View style={styles.outer}>
      <Animated.View style={[styles.panel, { height }]}>
        <View style={styles.panelInner}>
          <ScrollView
            ref={scrollRef}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={scrollToEnd}
            onLayout={scrollToEnd}
          >
            {messages.map((msg) => (
              <View key={msg.id} style={styles.messageBubble}>
                <Text style={styles.messageText}>{msg.text}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.handleWrapper, { top: height }]}
        {...panResponder.panHandlers}
      >
        <Pressable onPress={toggle}>
          <View style={styles.handleBar}>
            <Text style={styles.handleArrow}>{expanded ? '\u25B2' : '\u25BC'}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default React.memo(MessagePanel);

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
  },
  panel: {
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
    borderBottomWidth: 1,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    borderLeftColor: 'rgba(0, 0, 0, 0.05)',
    borderRightColor: 'rgba(0, 0, 0, 0.05)',
  },
  panelInner: {
    flex: 1,
    overflow: 'hidden',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  scrollArea: {
    flex: 1,
    paddingTop: 50,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  messageBubble: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  messageText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  handleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 6,
  },
  handleBar: {
    width: 80,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleArrow: {
    color: '#ffffff',
    fontSize: 10,
  },
});

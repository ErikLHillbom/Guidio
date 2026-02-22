import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Message } from '../types';

const EXPANDED_HEIGHT = 408;

interface Props {
  messages: Message[];
}

export default function MessagePanel({ messages }: Props) {
  const height = useRef(new Animated.Value(0)).current;
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const toggle = () => {
    const target = expanded ? 0 : EXPANDED_HEIGHT;
    Animated.spring(height, {
      toValue: target,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
    setExpanded(!expanded);
  };

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

      <Animated.View style={[styles.handleWrapper, { top: height }]}>
        <Pressable onPress={toggle}>
          <View style={styles.handleBar}>
            <Text style={styles.handleArrow}>{expanded ? '\u25B2' : '\u25BC'}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
  },
  panel: {
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
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
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  scrollArea: {
    flex: 1,
    paddingTop: 8,
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
    backgroundColor: '#1b24d3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleArrow: {
    color: '#ffffff',
    fontSize: 10,
  },
});

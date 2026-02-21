import { useCallback, useRef, useState } from 'react';
import { Message } from '../types';

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome',
    text: 'Welcome to Guidio! Press Start to begin your tour.',
    timestamp: new Date(),
  },
];

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const counter = useRef(0);

  const addMessage = useCallback((text: string) => {
    counter.current += 1;
    const id = `msg-${Date.now()}-${counter.current}`;
    setMessages((prev) => [...prev, { id, text, timestamp: new Date() }]);
  }, []);

  return { messages, addMessage } as const;
}

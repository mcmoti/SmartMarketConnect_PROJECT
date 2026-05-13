/**
 * Example: Chat/Messaging Component
 * Demonstrates real-time messaging with the API integration system
 */

import { useState } from 'react';
import { useMessages, useSendMessage, useUnreadCount } from '@/lib/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export function ChatWindowExample({ conversationId }: { conversationId: string }) {
  const [messageText, setMessageText] = useState('');
  
  const { data: messages, isLoading } = useMessages(conversationId, { ordering: '-created_at' });
  const { data: unreadCount } = useUnreadCount();
  const sendMessage = useSendMessage(conversationId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    await sendMessage.mutateAsync({
      conversation_id: conversationId,
      content: messageText,
    });

    setMessageText('');
  };

  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map(() => <Skeleton key={Math.random()} className="h-12" />)}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Unread Count Badge */}
      {unreadCount > 0 && (
        <div className="bg-blue-100 text-blue-800 px-3 py-1 text-sm rounded mb-2">
          {unreadCount} unread messages
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages?.results?.map((message) => (
          <div key={message.id} className="flex flex-col">
            <div className="text-sm font-semibold text-gray-700">
              {message.sender_name}
            </div>
            <div className="bg-gray-100 rounded-lg p-3 mt-1">
              <p className="text-gray-800">{message.content}</p>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(message.created_at).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <Input
          placeholder="Type a message..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          disabled={sendMessage.isPending}
        />
        <Button 
          type="submit" 
          disabled={sendMessage.isPending || !messageText.trim()}
        >
          {sendMessage.isPending ? 'Sending...' : 'Send'}
        </Button>
      </form>
    </div>
  );
}

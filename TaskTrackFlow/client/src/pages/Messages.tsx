
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import UserAvatar from '@/components/UserAvatar';
import { useTimeAgo } from '@/hooks/useTimeAgo';

export default function Messages() {
  const { currentUser } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState('');

  const { data: allUsers } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!currentUser?.id
  });

  const suggestedUsers = allUsers?.filter(user => 
    user.id !== currentUser?.id
  ) || [];

  const { data: conversations } = useQuery({
    queryKey: ['/api/messages/conversations'],
    enabled: !!currentUser?.id,
  });

  const { data: messages } = useQuery({
    queryKey: [`/api/messages/conversation/${selectedUserId}`],
    enabled: !!selectedUserId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/messages', {
        receiverId: selectedUserId,
        content: messageContent,
      });
    },
    onSuccess: () => {
      setMessageContent('');
      queryClient.invalidateQueries({ queryKey: [`/api/messages/conversation/${selectedUserId}`] });
    },
  });

  const handleSendMessage = () => {
    if (messageContent.trim() && selectedUserId) {
      sendMessageMutation.mutate();
    }
  };

  return (
    <div className="flex h-screen">
      {/* Conversations list */}
      <div className="w-1/3 border-r border-border">
        <h2 className="p-4 font-semibold">Messages</h2>
        <div className="divide-y divide-border">
          {suggestedUsers.length > 0 && (
            <div className="p-4 bg-accent/30">
              <h3 className="font-medium mb-2">Platform Kullanıcıları</h3>
              <div className="space-y-2">
                {suggestedUsers.map((user: any) => (
                  <button
                    key={user.id}
                    className="w-full p-2 text-left hover:bg-accent rounded-lg flex items-center gap-3"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <UserAvatar user={user} size="sm" />
                    <div className="font-medium">{user.displayName}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {conversations?.map((conv: any) => (
            <button
              key={conv.userId}
              className={`w-full p-4 text-left hover:bg-accent/50 ${
                selectedUserId === conv.userId ? 'bg-accent' : ''
              }`}
              onClick={() => setSelectedUserId(conv.userId)}
            >
              <div className="flex items-center gap-3">
                <UserAvatar user={conv.user} size="sm" />
                <div>
                  <div className="font-medium">{conv.user.displayName}</div>
                  <div className="text-sm text-muted-foreground">{conv.lastMessage?.content}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col">
        {selectedUserId ? (
          <>
            <div className="flex-1 p-4 overflow-y-auto">
              {messages?.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 mb-4 ${
                    msg.senderId === currentUser?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-xl ${
                      msg.senderId === currentUser?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent'
                    }`}
                  >
                    {msg.content}
                    <div className="text-xs opacity-70 mt-1">
                      {useTimeAgo(msg.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="flex-1 bg-accent/50 rounded-full px-4 py-2"
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageContent.trim()}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-full disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}

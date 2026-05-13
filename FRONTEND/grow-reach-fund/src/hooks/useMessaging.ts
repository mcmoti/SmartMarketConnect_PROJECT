import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import messagingService, { CreateMessageRequest } from '@/lib/services/messaging';
import { useToast } from '@/hooks/use-toast';

const CONVERSATIONS_QUERY_KEY = ['conversations'];
const CONVERSATION_DETAIL_QUERY_KEY = (id: string) => ['conversation', id];
const MESSAGES_QUERY_KEY = (conversationId: string) => ['messages', conversationId];
const UNREAD_COUNT_QUERY_KEY = ['unread-count'];

export const useConversations = (params?: any) => {
  return useQuery({
    queryKey: [...CONVERSATIONS_QUERY_KEY, params],
    queryFn: () => messagingService.getConversations(params),
    staleTime: 2 * 60 * 1000, // 2 minutes - frequent updates
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
};

export const useConversation = (id: string | undefined, params?: any) => {
  return useQuery({
    queryKey: id ? [CONVERSATION_DETAIL_QUERY_KEY(id), params] : [],
    queryFn: () => (id ? messagingService.getConversation(id, params) : Promise.reject('No ID')),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 15 * 1000, // Refetch every 15 seconds for live updates
  });
};

export const useMessages = (conversationId: string | undefined, params?: any) => {
  return useQuery({
    queryKey: conversationId ? [MESSAGES_QUERY_KEY(conversationId), params] : [],
    queryFn: () => 
      conversationId 
        ? messagingService.getMessages(conversationId, params) 
        : Promise.reject('No conversation ID'),
    enabled: !!conversationId,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 1000, // More frequent for messages
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (participantIds: string[]) =>
      messagingService.createConversation(participantIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
      toast({
        title: 'Success',
        description: 'Conversation created',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create conversation',
        variant: 'destructive',
      });
    },
  });
};

export const useSendMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateMessageRequest) => messagingService.sendMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY(conversationId) });
      queryClient.invalidateQueries({ queryKey: CONVERSATION_DETAIL_QUERY_KEY(conversationId) });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });
};

export const useMarkMessageAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => messagingService.markMessageAsRead(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });
};

export const useMarkConversationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      messagingService.markConversationAsRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => messagingService.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
      toast({
        title: 'Success',
        description: 'Conversation deleted',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete conversation',
        variant: 'destructive',
      });
    },
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: () => messagingService.getUnreadCount(),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 30 * 1000, // Check every 30 seconds
  });
};

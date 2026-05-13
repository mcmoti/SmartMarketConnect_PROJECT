import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import transactionService, { 
  CreateTransactionRequest, 
  CreateReviewRequest 
} from '@/lib/services/transactions';
import { useToast } from '@/hooks/use-toast';

const TRANSACTIONS_QUERY_KEY = ['transactions'];
const TRANSACTION_DETAIL_QUERY_KEY = (id: string) => ['transaction', id];
const REVIEWS_QUERY_KEY = ['reviews'];
const USER_REVIEWS_QUERY_KEY = (userId: string) => ['reviews', userId];

export const useTransactions = (params?: any) => {
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, params],
    queryFn: () => transactionService.getUserTransactions(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTransaction = (id: string | undefined) => {
  return useQuery({
    queryKey: id ? TRANSACTION_DETAIL_QUERY_KEY(id) : [],
    queryFn: () => (id ? transactionService.getTransaction(id) : Promise.reject('No ID')),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateTransactionRequest) =>
      transactionService.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      toast({
        title: 'Success',
        description: 'Transaction created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create transaction',
        variant: 'destructive',
      });
    },
  });
};

export const useUserReviews = (userId: string) => {
  return useQuery({
    queryKey: USER_REVIEWS_QUERY_KEY(userId),
    queryFn: () => transactionService.getUserReviews(userId),
    staleTime: 10 * 60 * 1000,
  });
};

export const useMyReviews = (params?: any) => {
  return useQuery({
    queryKey: [...REVIEWS_QUERY_KEY, params],
    queryFn: () => transactionService.getMyReviews(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateReviewRequest) =>
      transactionService.createReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY });
      toast({
        title: 'Success',
        description: 'Review posted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post review',
        variant: 'destructive',
      });
    },
  });
};

export const useUserRatingStats = (userId: string) => {
  return useQuery({
    queryKey: ['rating-stats', userId],
    queryFn: () => transactionService.getUserRatingStats(userId),
    staleTime: 10 * 60 * 1000,
  });
};

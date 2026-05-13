import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import paymentService, { 
  AddToCartRequest, 
  MpesaSTKPushRequest 
} from '@/integrations/django/services';
import { useToast } from '@/hooks/use-toast';

const PAYMENTS_QUERY_KEY = ['payments'];
const PAYMENT_DETAIL_QUERY_KEY = (id: string) => ['payment', id];
const CART_QUERY_KEY = ['cart'];

export const usePayments = (params?: any) => {
  return useQuery({
    queryKey: [...PAYMENTS_QUERY_KEY, params],
    queryFn: () => paymentService.getPayments(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const usePayment = (id: string | undefined) => {
  return useQuery({
    queryKey: id ? PAYMENT_DETAIL_QUERY_KEY(id) : [],
    queryFn: () => (id ? paymentService.getPayment(id) : Promise.reject('No ID')),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
};

export const useCart = () => {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: () => paymentService.getCart(),
    staleTime: 2 * 60 * 1000,
  });
};

export const useAddToCart = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: AddToCartRequest) => paymentService.addToCart(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast({
        title: 'Success',
        description: 'Item added to cart',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add to cart',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      paymentService.updateCartItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update cart item',
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (itemId: string) => paymentService.removeFromCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast({
        title: 'Success',
        description: 'Item removed from cart',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove from cart',
        variant: 'destructive',
      });
    },
  });
};

export const useClearCart = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => paymentService.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast({
        title: 'Success',
        description: 'Cart cleared',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to clear cart',
        variant: 'destructive',
      });
    },
  });
};

export const useCheckout = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (paymentMethod: string) => paymentService.checkout(paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY });
      toast({
        title: 'Success',
        description: 'Checkout successful',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Checkout failed',
        variant: 'destructive',
      });
    },
  });
};

export const useInitiateMpesaPayment = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: MpesaSTKPushRequest) =>
      paymentService.initiateMpesaPayment(data),
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'M-Pesa prompt sent to your phone',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate payment',
        variant: 'destructive',
      });
    },
  });
};

export const useCheckPaymentStatus = (paymentId: string | undefined) => {
  return useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn: () => (paymentId ? paymentService.checkPaymentStatus(paymentId) : Promise.reject('No ID')),
    enabled: !!paymentId,
    refetchInterval: 5 * 1000, // Poll every 5 seconds while pending
  });
};

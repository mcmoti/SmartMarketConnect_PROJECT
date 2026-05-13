import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import authService from '@/lib/auth';
import productService, { Product, CreateProductRequest } from '@/integrations/django/services';
import { useToast } from '@/hooks/use-toast';

const PRODUCTS_QUERY_KEY = ['products'];
const PRODUCT_DETAIL_QUERY_KEY = (id: string) => ['product', id];

export const useProducts = (params?: any) => {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, params],
    queryFn: () => productService.getProducts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProduct = (id: string | undefined) => {
  return useQuery({
    queryKey: id ? PRODUCT_DETAIL_QUERY_KEY(id) : [],
    queryFn: () => (id ? productService.getProduct(id) : Promise.reject('No ID')),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateProductRequest) => productService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      toast({
        title: 'Success',
        description: 'Product created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create product',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateProduct = (id: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Partial<CreateProductRequest>) =>
      productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_DETAIL_QUERY_KEY(id) });
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update product',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete product',
        variant: 'destructive',
      });
    },
  });
};

export const usePlaceBid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: productService.placeBid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      toast({
        title: 'Success',
        description: 'Bid placed successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to place bid',
        variant: 'destructive',
      });
    },
  });
};

export const useAcceptBid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: productService.acceptBid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      toast({
        title: 'Success',
        description: 'Bid accepted',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept bid',
        variant: 'destructive',
      });
    },
  });
};

export const useRejectBid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: productService.rejectBid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      toast({
        title: 'Success',
        description: 'Bid rejected',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject bid',
        variant: 'destructive',
      });
    },
  });
};

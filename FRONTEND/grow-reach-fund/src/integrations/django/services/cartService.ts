/**
 * Cart & Checkout API Services
 * Handles shopping cart operations and checkout process
 */

import { djangoAPI } from '../client';

export interface CartItem {
  id: number;
  cart_id: number;
  product_id: number;
  quantity: number;
  price_at_add: number;
  created_at: string;
}

export interface Cart {
  id: number;
  user_id: number;
  total_items: number;
  total_price: number;
  items: CartItem[];
  created_at: string;
  updated_at: string;
}

class CartService {
  async getCart(): Promise<Cart> {
    return djangoAPI.get('/cart/');
  }

  async addToCart(productId: number, quantity: number): Promise<CartItem> {
    return djangoAPI.post('/cart-items/', {
      product_id: productId,
      quantity,
    });
  }

  async updateCartItem(itemId: number, quantity: number): Promise<CartItem> {
    return djangoAPI.patch(`/cart-items/${itemId}/`, { quantity });
  }

  async removeFromCart(itemId: number): Promise<void> {
    return djangoAPI.delete(`/cart-items/${itemId}/`);
  }

  async clearCart(): Promise<void> {
    return djangoAPI.post('/cart/clear/');
  }

  async getCartCount(): Promise<number> {
    const cart = await this.getCart();
    return cart.total_items;
  }
}

export const cartService = new CartService();

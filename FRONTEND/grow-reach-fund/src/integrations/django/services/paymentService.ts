/**
 * Payment & Transaction API Services
 * Handles M-Pesa payments and transaction management
 */

import { djangoAPI } from '../client';

export interface Transaction {
  id: number;
  user_id: number;
  amount: number;
  type: 'payment' | 'refund' | 'transfer';
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  transaction_id: number;
  mpesa_receipt: string;
  phone_number: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface STKPushRequest {
  phone_number: string;
  amount: number;
  reference: string;
}

class PaymentService {
  async initiateSTKPush(data: STKPushRequest): Promise<{ checkout_request_id: string }> {
    return djangoAPI.post('/payments/mpesa/stk-push/', data);
  }

  async getTransactions(filters?: any): Promise<Transaction[]> {
    return djangoAPI.get('/transactions/', { params: filters });
  }

  async getTransactionDetail(id: number): Promise<Transaction> {
    return djangoAPI.get(`/transactions/${id}/`);
  }

  async getPaymentHistory(userId?: number) {
    return djangoAPI.get('/transactions/', {
      params: { ...(userId && { user_id: userId }) }
    });
  }

  async verifyPayment(mpesaReceipt: string): Promise<Payment> {
    return djangoAPI.get(`/payments/verify/${mpesaReceipt}/`);
  }

  async retryPayment(transactionId: number): Promise<Transaction> {
    return djangoAPI.post(`/transactions/${transactionId}/retry/`);
  }
}

export const paymentService = new PaymentService();

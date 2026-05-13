# API Integration System - Quick Start Guide

## 📋 Prerequisites

- Node.js 18+ and npm/bun
- Django backend running (http://localhost:8000)
- PostgreSQL database
- Redis (for Celery tasks and WebSocket support)

## 🚀 Quick Setup

### 1. Frontend Environment Setup

Create a `.env` file in the frontend root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=Smart Market Connect
VITE_APP_ENV=development

# Optional: Analytics, etc.
VITE_ANALYTICS_ID=your_analytics_id
```

### 2. Verify Backend Configuration

Ensure your Django settings (`Backend/smc_backend/config/settings/`) include:

```python
# CORS Settings
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',  # Vite dev server
]

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}
```

### 3. Start Both Servers

**Backend:**
```bash
cd Backend
python manage.py runserver 0.0.0.0:8000
```

**Frontend:**
```bash
cd FRONTEND/grow-reach-fund
npm run dev
# or
bun run dev
```

## 📁 File Structure

```
src/
├── lib/
│   ├── api.ts                 # Base API client with interceptors
│   ├── auth.ts                # Authentication service
│   ├── index.ts               # Central exports for all APIs
│   ├── API_INTEGRATION_GUIDE.md
│   └── services/
│       ├── products.ts        # Products & Bids API
│       ├── transactions.ts    # Transactions & Reviews API
│       ├── credit.ts          # Credit scoring API
│       ├── messaging.ts       # Real-time messaging API
│       └── payments.ts        # Payments & Cart API
├── hooks/
│   ├── useAuth.ts             # Authentication hook
│   ├── useProducts.ts         # Products queries & mutations
│   ├── useTransactions.ts     # Transaction hooks
│   ├── useCredit.ts           # Credit hooks
│   ├── useMessaging.ts        # Messaging hooks
│   └── usePayments.ts         # Payment & cart hooks
└── components/
    └── examples/
        ├── LoginExample.tsx
        ├── ProductsListExample.tsx
        └── ChatWindowExample.tsx
```

## 🔐 Authentication Flow

### 1. User Logs In

```typescript
import { useAuth } from '@/lib/index';

function LoginPage() {
  const { login } = useAuth();
  
  const handleLogin = async (email, password) => {
    await login({ email, password });
    // Tokens automatically stored in localStorage
    // User object cached in React Query
  };
}
```

### 2. Automatic Token Injection

Every API request automatically includes the JWT token:

```typescript
// Request interceptor in lib/api.ts
Authorization: Bearer {access_token}
```

### 3. Token Refresh

If a request returns 401, the client automatically:
1. Requests a new access token using the refresh token
2. Retries the original request
3. If refresh fails, redirects to login

### 4. Logout

```typescript
const { logout } = useAuth();

logout(); // Clears tokens and caches
```

## 🏗️ Creating New Features

### Example: Create a Buyer Profile Feature

**1. Add Service Method** (`lib/services/buyer.ts`):
```typescript
import apiClient from '@/lib/api';

class BuyerService {
  async getBuyerProfile(): Promise<BuyerProfile> {
    const response = await apiClient.get<BuyerProfile>('/buyers/me/');
    return response.data;
  }

  async updateBuyerProfile(data: BuyerProfileUpdate): Promise<BuyerProfile> {
    const response = await apiClient.patch<BuyerProfile>('/buyers/me/', data);
    return response.data;
  }
}

export default new BuyerService();
```

**2. Create React Hook** (`hooks/useBuyer.ts`):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import buyerService from '@/lib/services/buyer';
import { useToast } from '@/hooks/use-toast';

export const useBuyerProfile = () => {
  return useQuery({
    queryKey: ['buyer-profile'],
    queryFn: () => buyerService.getBuyerProfile(),
    staleTime: 30 * 60 * 1000,
  });
};

export const useUpdateBuyerProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data) => buyerService.updateBuyerProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-profile'] });
      toast({ title: 'Profile updated' });
    },
  });
};
```

**3. Export from Central Index** (`lib/index.ts`):
```typescript
export { default as buyerService } from './services/buyer';
export { useBuyerProfile, useUpdateBuyerProfile } from '@/hooks/useBuyer';
```

**4. Use in Component**:
```typescript
import { useBuyerProfile, useUpdateBuyerProfile } from '@/lib/index';

function BuyerProfilePage() {
  const { data: profile } = useBuyerProfile();
  const updateProfile = useUpdateBuyerProfile();

  return (
    <div>
      <h1>{profile?.full_name}</h1>
      <button onClick={() => updateProfile.mutate({ full_name: 'New Name' })}>
        Update
      </button>
    </div>
  );
}
```

## 🔍 Common Patterns

### Loading States

```typescript
const { data, isLoading, error } = useProducts();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorAlert error={error} />;

return <ProductList products={data?.results} />;
```

### Form Submission with Mutation

```typescript
const createProduct = useCreateProduct();
const [formData, setFormData] = useState({});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    await createProduct.mutateAsync(formData);
    // Success toast shown automatically
  } catch (error) {
    // Error toast shown automatically
  }
};
```

### Pagination

```typescript
const [page, setPage] = useState(1);
const { data } = useProducts({ page });

<button disabled={!data?.next} onClick={() => setPage(page + 1)}>
  Next Page
</button>
```

### Search & Filter

```typescript
const [search, setSearch] = useState('');
const [filters, setFilters] = useState({});

const { data } = useProducts({
  search,
  ...filters,
});
```

### Optimistic Updates

```typescript
const queryClient = useQueryClient();
const updateItem = useMutation({
  mutationFn: updateItemAPI,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['items'] });
    
    const previous = queryClient.getQueryData(['items']);
    queryClient.setQueryData(['items'], (old) => ({
      ...old,
      results: old.results.map(item => 
        item.id === newData.id ? { ...item, ...newData } : item
      ),
    }));
    
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['items'], context.previous);
  },
});
```

## 🧪 Testing

### Testing with Mock API

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('http://localhost:8000/api/products/', (req, res, ctx) => {
    return res(ctx.json({
      count: 10,
      results: [{ id: 1, name: 'Product' }],
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProducts } from '@/hooks/useProducts';

it('loads products', async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useProducts(), { wrapper });

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.data?.results).toBeDefined();
});
```

## 🐛 Troubleshooting

### 401 Unauthorized on Every Request

**Problem**: Token not being sent with requests

**Solution**:
1. Check token is in localStorage: `localStorage.getItem('access_token')`
2. Verify backend is returning tokens on login
3. Check CORS settings allow the frontend URL

### CORS Errors

**Problem**: `Access to XMLHttpRequest at 'http://localhost:8000/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solution**:
```python
# In Django settings
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]
```

### Stale Data Issues

**Problem**: Data not updating after mutations

**Solution**: Use `queryClient.invalidateQueries()` after successful mutations (already done in hooks)

### Network Timeouts

**Problem**: Requests timing out

**Solution**:
1. Increase timeout in `lib/api.ts`:
```typescript
const apiClient = axios.create({
  timeout: 30000, // 30 seconds
});
```

2. Check backend logs for slow queries
3. Ensure Redis is running for Celery tasks

### WebSocket Not Working

**Problem**: Real-time updates not working

**Current**: Using polling with `refetchInterval`
**Next**: Implement WebSocket upgrade in `lib/websocket.ts`

## 📊 Performance Tips

1. **Cache Aggressively**: Increase `staleTime` for rarely-changing data
2. **Lazy Load**: Use `enabled` flag to skip queries until needed
3. **Paginate**: Always paginate large result sets
4. **Debounce Search**: Add debounce to search inputs
5. **Batch Requests**: Combine multiple queries into one endpoint

## 📖 API Endpoints Summary

| Service | Endpoint | Method | Purpose |
|---------|----------|--------|---------|
| Auth | `/auth/login/` | POST | User login |
| Auth | `/auth/register/` | POST | User registration |
| Auth | `/users/me/` | GET | Current user |
| Products | `/products/` | GET | List products |
| Products | `/products/` | POST | Create product |
| Products | `/bids/` | POST | Place bid |
| Transactions | `/transactions/` | GET | List transactions |
| Reviews | `/reviews/` | POST | Create review |
| Credit | `/credit-requests/` | POST | Request credit |
| Credit | `/credit-scores/my-score/` | GET | Get credit score |
| Messages | `/conversations/` | GET | List conversations |
| Messages | `/messages/` | POST | Send message |
| Cart | `/cart/` | GET | Get cart |
| Cart | `/cart-items/` | POST | Add to cart |
| Payments | `/payments/mpesa/stk-push/` | POST | M-Pesa payment |

## 🔗 Additional Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [Axios Docs](https://axios-http.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [JWT Authentication](https://django-rest-framework-simplejwt.readthedocs.io/)

## 📝 Next Steps

1. ✅ Review the API_INTEGRATION_GUIDE.md
2. ✅ Check example components in `src/components/examples/`
3. ✅ Review hook usage in existing components
4. ✅ Test API calls in your browser's Network tab
5. ✅ Implement features using the established patterns

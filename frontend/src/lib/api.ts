const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
}

export function getAccessToken(): string | null {
  if (!accessToken) {
    accessToken = localStorage.getItem('accessToken');
  }
  return accessToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && path !== '/auth/refresh') {
    // Try refresh
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setAccessToken(data.data.accessToken);
        // Retry original request
        const retryRes = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers: { ...headers, Authorization: `Bearer ${data.data.accessToken}` },
          credentials: 'include',
        });
        return retryRes.json();
      }
    } catch { /* refresh failed */ }
    setAccessToken(null);
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  sendOtp: (body: { fullName: string; email: string; password: string; role?: 'customer' | 'delivery_partner' }) =>
    api.post<{ success: boolean; message: string }>('/auth/send-otp', body),
  verifyOtp: (body: { email: string; otp: string; fullName: string; password: string; role?: 'customer' | 'delivery_partner' }) =>
    api.post<{ success: boolean; data: { accessToken: string; user: UserData } }>('/auth/verify-otp', body),
  register: (body: { fullName: string; email: string; password: string; role?: 'customer' | 'delivery_partner' }) =>
    api.post<{ success: boolean; data: { accessToken: string; user: UserData } }>('/auth/register', body),
  login: (body: { email: string; password: string; loginRole?: 'customer' | 'delivery_partner' }) =>
    api.post<{ success: boolean; data: { accessToken: string; user: UserData } }>('/auth/login', body),
  auth0Auth: (accessToken: string) =>
    api.post<{ success: boolean; data: { accessToken: string; user: UserData } }>('/auth/auth0', { accessToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<{ success: boolean; data: UserData }>('/auth/me'),
  forgotPassword: (email: string) =>
    api.post<{ success: boolean; message: string }>('/auth/forgot-password', { email }),
  resetPassword: (body: { token: string; password: string }) =>
    api.post<{ success: boolean; message: string }>('/auth/reset-password', body),
  updatePassword: (body: { currentPassword?: string; newPassword: string }) =>
    api.put<{ success: boolean; message: string }>('/auth/update-password', body),
};

// ─── Products ────────────────────────────────────────────────────────────────
export const productApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ success: boolean; data: any[]; pagination: any }>(`/products${qs}`);
  },
  featured: () => api.get<{ success: boolean; data: any[] }>('/products/featured'),
  get: (slug: string) => api.get<{ success: boolean; data: any }>(`/products/${slug}`),
  reviews: (productId: string) => api.get<{ success: boolean; data: any[] }>(`/products/${productId}/reviews`),
  createReview: (productId: string, body: { rating: number; title?: string; body: string }) =>
    api.post(`/products/${productId}/reviews`, body),
  // ── Admin CRUD ─────────────────────────────────────────────────────────────
  create: (body: any) =>
    api.post<{ success: boolean; data: any }>('/products', body),
  update: (productId: string, body: any) =>
    api.put<{ success: boolean; data: any }>(`/products/${productId}`, body),
  remove: (productId: string) =>
    api.delete<{ success: boolean }>(`/products/${productId}`),
  updateInventory: (productId: string, inventory: number, lowStockThreshold?: number) =>
    api.patch<{ success: boolean; data: any }>(`/products/${productId}/inventory`, { inventory, lowStockThreshold }),
};

// ─── Categories ──────────────────────────────────────────────────────────────
export const categoryApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ success: boolean; data: any[] }>(`/categories${qs}`);
  },
  get: (slug: string) => api.get<{ success: boolean; data: any }>(`/categories/${slug}`),
  create: (body: any) => api.post<{ success: boolean; data: any }>('/categories', body),
  update: (id: string, body: any) => api.put<{ success: boolean; data: any }>(`/categories/${id}`, body),
  remove: (id: string) => api.delete<{ success: boolean }>(`/categories/${id}`),
};

// ─── Cart ────────────────────────────────────────────────────────────────────
export const cartApi = {
  get: () => api.get<{ success: boolean; data: any }>('/cart'),
  add: (body: { productId: string; variantId?: string; quantity: number }) => api.post('/cart/items', body),
  update: (body: { productId: string; variantId?: string; quantity: number }) => api.put('/cart/items', body),
  clear: () => api.delete('/cart'),
  applyCoupon: (code: string) => api.post<{ success: boolean; data: any }>('/cart/coupon', { code }),
};

// ─── Orders ──────────────────────────────────────────────────────────────────
export const orderApi = {
  create: (body: any) => api.post<{ success: boolean; data: any }>('/orders', body),
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ success: boolean; data: any[] }>(`/orders${qs}`);
  },
  get: (orderNumber: string) => api.get<{ success: boolean; data: any }>(`/orders/${orderNumber}`),
  cancel: (orderNumber: string, reason?: string) => api.put<{ success: boolean; data: any }>(`/orders/${orderNumber}/cancel`, { reason }),
};

// ─── Payments (Razorpay) ─────────────────────────────────────────────────────
export const paymentApi = {
  createOrder: (amount: number, currency = 'INR') =>
    api.post<{ success: boolean; data: { orderId: string; amount: number; currency: string; keyId: string } }>(
      '/payment/create-order', { amount, currency }
    ),
  verify: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    api.post<{ success: boolean; data: { verified: boolean; razorpay_order_id: string; razorpay_payment_id: string } }>(
      '/payment/verify', data
    ),
};

// ─── User ────────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile: () => api.get<{ success: boolean; data: UserData }>('/users/profile'),
  updateProfile: (body: Partial<UserData>) => api.put('/users/profile', body),
  getWishlist: () => api.get<{ success: boolean; data: any[] }>('/users/wishlist'),
  toggleWishlist: (productId: string) => api.post('/users/wishlist/toggle', { productId }),
  getAddresses: () => api.get<{ success: boolean; data: any[] }>('/users/addresses'),
  addAddress: (body: any) => api.post<{ success: boolean; data: any[] }>('/users/addresses', body),
  updateAddress: (addressId: string, body: any) => api.put<{ success: boolean; data: any[] }>(`/users/addresses/${addressId}`, body),
  deleteAddress: (addressId: string) => api.delete<{ success: boolean; data: any[] }>(`/users/addresses/${addressId}`),
};

// ─── Admin ───────────────────────────────────────────────────────────────────
export const adminApi = {
  stats: () => api.get<{ success: boolean; data: any }>('/users/admin/stats'),
  users: () => api.get<{ success: boolean; data: any[] }>('/users/admin/all'),
  customers: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ success: boolean; data: any[]; pagination: any }>(`/users/admin/customers${qs}`);
  },
  deliveryPartners: () => api.get<{ success: boolean; data: any[] }>('/users/admin/delivery-partners'),
  createDeliveryPartner: (body: { fullName: string; email: string; phone?: string; password: string }) =>
    api.post<{ success: boolean; data: any }>('/users/admin/delivery-partners', body),
  updateDeliveryPartner: (id: string, body: { fullName?: string; phone?: string; isActive?: boolean; password?: string }) =>
    api.put<{ success: boolean; data: any }>(`/users/admin/delivery-partners/${id}`, body),
  deleteDeliveryPartner: (id: string) =>
    api.delete<{ success: boolean }>(`/users/admin/delivery-partners/${id}`),
};

// ─── Delivery ────────────────────────────────────────────────────────────────
export const deliveryApi = {
  getAvailableOrders: () =>
    api.get<{ success: boolean; data: any[] }>('/delivery/orders/available'),
  getAssignedOrders: (type: 'active' | 'completed') =>
    api.get<{ success: boolean; data: any[] }>(`/delivery/orders/assigned?type=${type}`),
  claimOrder: (id: string) =>
    api.put<{ success: boolean; data: any }>(`/delivery/orders/${id}/claim`),
  updateStatus: (id: string, status: 'processing' | 'shipped' | 'delivered', message?: string) =>
    api.put<{ success: boolean; data: any }>(`/delivery/orders/${id}/status`, { status, message }),
  getStats: () =>
    api.get<{ success: boolean; data: any }>('/delivery/stats'),
};

// ─── Media ───────────────────────────────────────────────────────────────────
export const mediaApi = {
  upload: async (formData: FormData) => {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json() as Promise<{ success: boolean; data: { url: string; publicId: string } }>;
  },
  remove: (publicId: string) => api.post<{ success: boolean }>('/media/delete', { publicId }),
};

export interface UserData {
  _id: string;
  id?: string;
  email: string;
  fullName: string;
  role: 'customer' | 'delivery_partner' | 'admin';
  avatarUrl?: string;
  phone?: string;
  auth0Id?: string;
  googleId?: string;
  shippingAddress?: any;
  wishlist?: string[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

class ApiError extends Error {
  code: string;
  details?: any;
  statusCode: number;

  constructor(message: string, code = 'API_ERROR', statusCode = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bookleaf_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new ApiError(
        data.error?.message || data.message || `Request failed with status ${res.status}`,
        data.error?.code || 'HTTP_ERROR',
        res.status,
        data.error?.details
      );
    }

    return data as ApiResponse<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError((error as Error).message || 'Network connection failed', 'NETWORK_ERROR', 0);
  }
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  
  register: (payload: { email: string; password: string; name: string; phone?: string; role?: string }) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  
  getMe: () => apiRequest('/auth/me'),

  updateBankDetails: (payload: { bankName: string; accountNumberLast4: string; ifsc: string }) =>
    apiRequest('/auth/bank-details', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Books
  getBooks: (authorId?: string) =>
    apiRequest(`/books${authorId ? `?authorId=${authorId}` : ''}`),
  
  getBookById: (id: string) => apiRequest(`/books/${id}`),

  updateBookStatus: (id: string, payload: { status: string; isbn?: string }) =>
    apiRequest(`/books/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Tickets
  getTickets: (params?: {
    status?: string;
    category?: string;
    priority?: string;
    assignedToId?: string;
    search?: string;
    sortBy?: string;
  }) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) q.append(key, val);
      });
    }
    const queryStr = q.toString();
    return apiRequest(`/tickets${queryStr ? `?${queryStr}` : ''}`);
  },

  getTicketById: (id: string) => apiRequest(`/tickets/${id}`),

  createTicket: (payload: {
    subject: string;
    description: string;
    bookId?: string | null;
    attachments?: any[];
  }) => apiRequest('/tickets', { method: 'POST', body: JSON.stringify(payload) }),

  replyTicket: (id: string, payload: { message: string; isInternalNote?: boolean; attachments?: any[] }) =>
    apiRequest(`/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify(payload) }),

  updateTicketStatus: (id: string, status: string) =>
    apiRequest(`/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  updateTicketPriority: (id: string, priority: string, reason?: string) =>
    apiRequest(`/tickets/${id}/priority`, { method: 'PATCH', body: JSON.stringify({ priority, reason }) }),

  updateTicketCategory: (id: string, category: string, reason?: string) =>
    apiRequest(`/tickets/${id}/category`, { method: 'PATCH', body: JSON.stringify({ category, reason }) }),

  assignTicket: (id: string, adminId: string | null) =>
    apiRequest(`/tickets/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ adminId }) }),

  generateAiDraft: (id: string) =>
    apiRequest(`/tickets/${id}/generate-ai-draft`, { method: 'POST' }),

  // Stats
  getAdminStats: () => apiRequest('/stats/admin'),
};

const API_BASE_URL = 'http://localhost:8000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
  plan: string;
  created_at: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface ConversionResult {
  conversion_id: string;
  status: string;
  csv_data?: string;
  excel_data?: string;
  json_data?: any;
  pages_processed: number;
  credits_used: number;
  processing_method?: string;
  processing_time_seconds?: number;
  transactions?: any[];
}

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async register(name: string, email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error.detail || 'Registration failed' };
      }

      const data: LoginResponse = await response.json();
      
      // Store token
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token);
      }
      
      return { data };
    } catch (error) {
      return { error: 'Network error during registration' };
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error.detail || 'Login failed' };
      }

      const data: LoginResponse = await response.json();
      
      // Store token
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token);
      }
      
      return { data };
    } catch (error) {
      return { error: 'Network error during login' };
    }
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: this.getAuthHeaders(),
      });

      if (response.status === 401) {
        // Token expired - return specific error but don't clear token
        return { error: 'Token expired' };
      }

      if (!response.ok) {
        return { error: 'Failed to get user info' };
      }

      const data: User = await response.json();
      return { data };
    } catch (error) {
      return { error: 'Network error getting user info' };
    }
  }

  async convertBankStatement(
    file: File, 
    outputFormats: string[] = ['csv'],
    abortSignal?: AbortSignal,
    method: 'method1' | 'method2' = 'method2',
    config: 'fast' | 'accurate' | 'standard' = 'fast'
  ): Promise<ApiResponse<ConversionResult>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('output_formats', outputFormats.join(','));
      
      // Add config parameter for method2 (table-convert)
      if (method === 'method2') {
        formData.append('config', config);
      }
      
      console.log("DEBUG API: Sending formats:", outputFormats, "config:", config);

      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const endpoint = method === 'method2' ? '/table-convert/upload' : '/convert/upload';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
        signal: abortSignal,
      });

      if (response.status === 401) {
        // Token expired - return specific error but don't clear token
        return { error: 'Token expired' };
      }

      if (!response.ok) {
        const error = await response.json();
        return { error: error.detail || 'Conversion failed' };
      }

      const data: ConversionResult = await response.json();
      return { data };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error; // Re-throw AbortError so it can be handled in the component
      }
      return { error: 'Network error during conversion' };
    }
  }

  async downloadConvertedFile(conversionId: string, format: string): Promise<Blob | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/convert/download/${conversionId}/${format}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      return await response.blob();
    } catch (error) {
      return null;
    }
  }

  async downloadFile(conversionId: string, format: string): Promise<ApiResponse<Blob>> {
    try {
      const response = await fetch(`${API_BASE_URL}/convert/download/${conversionId}/${format}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.text();
        return { error: error || 'Download failed' };
      }

      const data = await response.blob();
      return { data };
    } catch (error) {
      return { error: 'Network error during download' };
    }
  }

  async googleOAuth(token: string): Promise<{ data?: LoginResponse, error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error.detail || 'Google authentication failed' };
      }

      const data: LoginResponse = await response.json();
      
      // Store the token
      if (typeof window !== 'undefined' && data.access_token) {
        localStorage.setItem('access_token', data.access_token);
      }
      
      return { data };
    } catch (error) {
      return { error: 'Network error during Google authentication' };
    }
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
  }
}

export const apiService = new ApiService();
export type { User, LoginResponse, ConversionResult };
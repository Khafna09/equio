export interface SignUpRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  language?: 'es' | 'en';
  currency?: string;
  theme?: 'light' | 'dark' | 'system';
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  language?: 'es' | 'en';
  currency?: string;
  roles: string[];
}

export interface AuthResponse extends AuthUser {
  accessToken: string;
  expiresInSeconds: number;
}

export interface SignUpRequest {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  language?: string;
}

export interface SignInRequest {
  email: string;
  password?: string;
}

export interface JwtResponse {
  token: string;
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  language?: string;
  roles: string[];
}

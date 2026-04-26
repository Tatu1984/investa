export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

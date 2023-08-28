import { JWT } from "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    userRole: string;
    id: string;
    user: User;
  }
}

declare module "next-auth" {
  interface Account {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  }
}

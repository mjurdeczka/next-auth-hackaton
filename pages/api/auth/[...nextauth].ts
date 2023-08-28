import NextAuth, { NextAuthOptions } from "next-auth";
import Auth0Provider from "next-auth/providers/auth0";
import { getNewTokens } from "../../../utils/auth";
import Redis from "ioredis";
import Redlock from "redlock";
import { JWT } from "next-auth/jwt";

const getAccessTokenExpiration = (accessTokenExp: number) =>
  (accessTokenExp - 86380) * 1000;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Auth0Provider({
      clientId: process.env.AUTH0_ID,
      clientSecret: process.env.AUTH0_SECRET,
      issuer: process.env.AUTH0_ISSUER,
      authorization: {
        params: {
          scope: "openid email profile offline_access",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      return { ...session, user: token.user };
    },
    async jwt({ token, account, user }) {
      const redis = new Redis();

      if (account && user) {
        const jwtToken: JWT = {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: getAccessTokenExpiration(account.expires_at),
          userRole: "admin",
          id: user.id,
          user,
        };

        await redis.set(`token:${user.id}`, JSON.stringify(jwtToken));

        return jwtToken;
      }

      if (Date.now() < token?.accessTokenExpires) {
        return token;
      }

      const redlock = new Redlock([redis], {
        driftFactor: 0.01,
        retryCount: 10,
        retryDelay: 200,
        retryJitter: 200,
        automaticExtensionThreshold: 500,
      });

      return await redlock.using([token.id, "jwt-refresh"], 5000, async () => {
        const redisToken = await redis.get(`token:${token.id}`);

        if (redisToken) {
          const currentToken: JWT = JSON.parse(redisToken);

          if (Date.now() < currentToken.accessTokenExpires) {
            return currentToken;
          }
        }

        const newTokens = await getNewTokens(token.refreshToken);

        const date = new Date();
        const accessTokenExpires = date.setDate(date.getDate() + 1);

        const jwtToken: JWT = {
          accessToken: newTokens.access_token as string,
          refreshToken: newTokens.refresh_token as string,
          accessTokenExpires,
          userRole: "admin",
          id: token.id,
          user: token.user,
        };

        await redis.set(`token:${token.id}`, JSON.stringify(jwtToken));

        return jwtToken;
      });
    },
  },
};

export default NextAuth(authOptions);

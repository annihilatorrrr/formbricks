import {
  EMAIL_VERIFICATION_DISABLED,
  ENCRYPTION_KEY,
  ENTERPRISE_LICENSE_KEY,
  SESSION_MAX_AGE,
} from "@/lib/constants";
import { symmetricDecrypt, symmetricEncrypt } from "@/lib/crypto";
import { verifyToken } from "@/lib/jwt";
import { getUserByEmail, updateUser, updateUserLastLoginAt } from "@/modules/auth/lib/user";
import {
  logAuthAttempt,
  logAuthEvent,
  logAuthSuccess,
  logEmailVerificationAttempt,
  logTwoFactorAttempt,
  shouldLogAuthFailure,
  verifyPassword,
} from "@/modules/auth/lib/utils";
import { applyIPRateLimit } from "@/modules/core/rate-limit/helpers";
import { rateLimitConfigs } from "@/modules/core/rate-limit/rate-limit-configs";
import { UNKNOWN_DATA } from "@/modules/ee/audit-logs/types/audit-log";
import { getSSOProviders } from "@/modules/ee/sso/lib/providers";
import { handleSsoCallback } from "@/modules/ee/sso/lib/sso-handlers";
import type { Account, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { cookies } from "next/headers";
import { prisma } from "@formbricks/database";
import { logger } from "@formbricks/logger";
import { TUser } from "@formbricks/types/user";
import { createBrevoCustomer } from "./brevo";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      // The name to display on the sign in form (e.g. "Sign in with...")
      name: "Credentials",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        email: {
          label: "Email Address",
          type: "email",
          placeholder: "Your email address",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Your password",
        },
        totpCode: { label: "Two-factor Code", type: "input", placeholder: "Code from authenticator app" },
        backupCode: { label: "Backup Code", type: "input", placeholder: "Two-factor backup code" },
      },
      async authorize(credentials, _req) {
        await applyIPRateLimit(rateLimitConfigs.auth.login);

        // Use email for rate limiting when available, fall back to "unknown_user" for credential validation
        const identifier = credentials?.email || "unknown_user"; // NOSONAR // We want to check for empty strings

        if (!credentials) {
          if (await shouldLogAuthFailure("no_credentials")) {
            logAuthAttempt("no_credentials_provided", "credentials", "credentials_validation");
          }
          throw new Error("Invalid credentials");
        }

        let user;
        try {
          user = await prisma.user.findUnique({
            where: {
              email: credentials?.email,
            },
          });
        } catch (e) {
          logger.error(e, "Error in CredentialsProvider authorize");
          logAuthAttempt("database_error", "credentials", "user_lookup", UNKNOWN_DATA, credentials?.email);
          throw Error("Internal server error. Please try again later");
        }

        if (!user) {
          if (await shouldLogAuthFailure(identifier)) {
            logAuthAttempt("user_not_found", "credentials", "user_lookup", UNKNOWN_DATA, credentials?.email);
          }
          throw new Error("Invalid credentials");
        }

        if (!user.password) {
          logAuthAttempt("no_password_set", "credentials", "password_validation", user.id, user.email);
          throw new Error("User has no password stored");
        }

        if (user.isActive === false) {
          logAuthAttempt("account_inactive", "credentials", "account_status", user.id, user.email);
          throw new Error("Your account is currently inactive. Please contact the organization admin.");
        }

        const isValid = await verifyPassword(credentials.password, user.password);

        if (!isValid) {
          if (await shouldLogAuthFailure(user.email)) {
            logAuthAttempt("invalid_password", "credentials", "password_validation", user.id, user.email);
          }
          throw new Error("Invalid credentials");
        }

        logAuthSuccess("passwordVerified", "credentials", "password_validation", user.id, user.email, {
          requires2FA: user.twoFactorEnabled,
        });

        if (user.twoFactorEnabled && credentials.backupCode) {
          if (!ENCRYPTION_KEY) {
            logger.error("Missing encryption key; cannot proceed with backup code login.");
            logTwoFactorAttempt(false, "backup_code", user.id, user.email, "encryption_key_missing");
            throw new Error("Internal Server Error");
          }

          if (!user.backupCodes) {
            logTwoFactorAttempt(false, "backup_code", user.id, user.email, "no_backup_codes");
            throw new Error("No backup codes found");
          }

          let backupCodes;

          try {
            backupCodes = JSON.parse(symmetricDecrypt(user.backupCodes, ENCRYPTION_KEY));
          } catch (e) {
            logger.error(e, "Error in CredentialsProvider authorize");
            logTwoFactorAttempt(false, "backup_code", user.id, user.email, "invalid_backup_codes");
            throw new Error("Invalid backup codes");
          }

          // check if user-supplied code matches one
          const index = backupCodes.indexOf(credentials.backupCode.replaceAll("-", ""));
          if (index === -1) {
            if (await shouldLogAuthFailure(user.email)) {
              logTwoFactorAttempt(false, "backup_code", user.id, user.email, "invalid_backup_code");
            }
            throw new Error("Invalid backup code");
          }

          // delete verified backup code and re-encrypt remaining
          backupCodes[index] = null;
          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              backupCodes: symmetricEncrypt(JSON.stringify(backupCodes), ENCRYPTION_KEY),
            },
          });

          logTwoFactorAttempt(true, "backup_code", user.id, user.email, undefined, {
            backupCodeConsumed: true,
          });
        } else if (user.twoFactorEnabled) {
          if (!credentials.totpCode) {
            logAuthEvent("twoFactorRequired", "success", user.id, user.email, {
              provider: "credentials",
              authMethod: "password_validation",
              requiresTOTP: true,
            });
            throw new Error("second factor required");
          }

          if (!user.twoFactorSecret) {
            logTwoFactorAttempt(false, "totp", user.id, user.email, "no_2fa_secret");
            throw new Error("Internal Server Error");
          }

          if (!ENCRYPTION_KEY) {
            logTwoFactorAttempt(false, "totp", user.id, user.email, "encryption_key_missing");
            throw new Error("Internal Server Error");
          }

          const secret = symmetricDecrypt(user.twoFactorSecret, ENCRYPTION_KEY);
          if (secret.length !== 32) {
            logTwoFactorAttempt(false, "totp", user.id, user.email, "invalid_2fa_secret");
            throw new Error("Invalid two factor secret");
          }

          const isValidToken = (await import("./totp")).totpAuthenticatorCheck(credentials.totpCode, secret);
          if (!isValidToken) {
            if (await shouldLogAuthFailure(user.email)) {
              logTwoFactorAttempt(false, "totp", user.id, user.email, "invalid_totp_code");
            }
            throw new Error("Invalid two factor code");
          }

          logTwoFactorAttempt(true, "totp", user.id, user.email);
        }

        let authMethod;
        if (!user.twoFactorEnabled) {
          authMethod = "password_only";
        } else if (credentials.backupCode) {
          authMethod = "password_and_backup_code";
        } else {
          authMethod = "password_and_totp";
        }

        logAuthSuccess("authenticationSucceeded", "credentials", authMethod, user.id, user.email);

        return {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          imageUrl: user.imageUrl,
        };
      },
    }),
    CredentialsProvider({
      id: "token",
      // The name to display on the sign in form (e.g. "Sign in with...")
      name: "Token",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        token: {
          label: "Verification Token",
          type: "string",
        },
      },
      async authorize(credentials, _req) {
        await applyIPRateLimit(rateLimitConfigs.auth.verifyEmail);

        // For token verification, we can't rate limit effectively by token (single-use)
        // So we use a generic identifier for token abuse attempts
        const identifier = "email_verification_attempts";

        let user;
        try {
          if (!credentials?.token) {
            if (await shouldLogAuthFailure(identifier)) {
              logEmailVerificationAttempt(false, "token_not_provided");
            }
            throw new Error("Token not found");
          }

          const { id } = await verifyToken(credentials?.token);
          user = await prisma.user.findUnique({
            where: {
              id: id,
            },
          });
        } catch (e) {
          logger.error(e, "Error in CredentialsProvider authorize");

          if (await shouldLogAuthFailure(identifier)) {
            logEmailVerificationAttempt(false, "invalid_token", UNKNOWN_DATA, undefined, {
              tokenProvided: !!credentials?.token,
            });
          }
          throw new Error("Either a user does not match the provided token or the token is invalid");
        }

        if (!user) {
          if (await shouldLogAuthFailure(identifier)) {
            logEmailVerificationAttempt(false, "user_not_found_for_token");
          }
          throw new Error("Either a user does not match the provided token or the token is invalid");
        }

        if (user.emailVerified) {
          logEmailVerificationAttempt(false, "email_already_verified", user.id, user.email);
          throw new Error("Email already verified");
        }

        if (user.isActive === false) {
          logEmailVerificationAttempt(false, "account_inactive", user.id, user.email);
          throw new Error("Your account is currently inactive. Please contact the organization admin.");
        }

        user = await updateUser(user.id, { emailVerified: new Date() });

        logEmailVerificationAttempt(true, undefined, user.id, user.email, {
          emailVerifiedAt: user.emailVerified,
        });

        // send new user to brevo after email verification
        createBrevoCustomer({ id: user.id, email: user.email });

        return user;
      },
    }),
    // Conditionally add enterprise SSO providers
    ...(ENTERPRISE_LICENSE_KEY ? getSSOProviders() : []),
  ],
  session: {
    maxAge: SESSION_MAX_AGE,
  },
  callbacks: {
    async jwt({ token }) {
      const existingUser = await getUserByEmail(token?.email!);

      if (!existingUser) {
        return token;
      }

      return {
        ...token,
        profile: { id: existingUser.id },
        isActive: existingUser.isActive,
      };
    },
    async session({ session, token }) {
      // @ts-expect-error
      session.user.id = token?.id;
      // @ts-expect-error
      session.user = token.profile;
      // @ts-expect-error
      session.user.isActive = token.isActive;

      return session;
    },
    async signIn({ user, account }: { user: TUser; account: Account }) {
      const cookieStore = await cookies();

      const callbackUrl = cookieStore.get("next-auth.callback-url")?.value || "";

      if (account?.provider === "credentials" || account?.provider === "token") {
        // check if user's email is verified or not
        if (!user.emailVerified && !EMAIL_VERIFICATION_DISABLED) {
          logger.error("Email Verification is Pending");
          throw new Error("Email Verification is Pending");
        }
        await updateUserLastLoginAt(user.email);
        return true;
      }
      if (ENTERPRISE_LICENSE_KEY) {
        const result = await handleSsoCallback({ user, account, callbackUrl });

        if (result) {
          await updateUserLastLoginAt(user.email);
        }
        return result;
      }
      await updateUserLastLoginAt(user.email);
      return true;
    },
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/login", // Error code passed in query string as ?error=
  },
};

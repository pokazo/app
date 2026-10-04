import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { emailOTP, genericOAuth, yandex } from "better-auth/plugins";
import { config } from "./env.js";
import { pool } from "./migrate.js";
import { sendOtpEmail } from "./mail.js";

export function createAuth() {
  if (!pool) return null;
  const plugins: BetterAuthPlugin[] = [
    emailOTP({
      otpLength: 6,
      expiresIn: 60 * 15,
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type !== "sign-in") return;
        await sendOtpEmail(email, otp);
      },
    }),
  ];
  if (config.yandexClientId && config.yandexClientSecret) {
    plugins.push(
      genericOAuth({
        config: [
          {
            ...yandex({
              clientId: config.yandexClientId,
              clientSecret: config.yandexClientSecret,
              pkce: true,
              redirectURI: `${config.apiOrigin}/api/auth/callback/yandex`,
            }),
            authorizationUrl: "https://oauth.yandex.ru/authorize",
            tokenUrl: "https://oauth.yandex.ru/token",
          },
        ],
      }),
    );
  }
  return betterAuth({
    secret: config.authSecret,
    baseURL: config.apiOrigin,
    basePath: "/api/auth",
    trustedOrigins: [
      config.appOrigin,
      config.apiOrigin,
      "https://pokazo.ru",
      "https://www.pokazo.ru",
      "https://api.pokazo.ru",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    database: pool,
    emailAndPassword: { enabled: false },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    advanced: {
      cookiePrefix: "pk",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.apiOrigin.startsWith("https"),
      },
      cookies: {
        session_token: {
          name: "pk_session",
        },
      },
    },
    plugins,
  });
}

export type Auth = NonNullable<ReturnType<typeof createAuth>>;

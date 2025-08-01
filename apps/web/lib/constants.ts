import "server-only";
import { TUserLocale } from "@formbricks/types/user";
import { env } from "./env";

export const IS_FORMBRICKS_CLOUD = env.IS_FORMBRICKS_CLOUD === "1";

export const IS_PRODUCTION = env.NODE_ENV === "production";

export const IS_DEVELOPMENT = env.NODE_ENV === "development";
export const E2E_TESTING = env.E2E_TESTING === "1";

// URLs
export const WEBAPP_URL =
  env.WEBAPP_URL || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : false) || "http://localhost:3000";

// encryption keys
export const ENCRYPTION_KEY = env.ENCRYPTION_KEY;

// Other
export const CRON_SECRET = env.CRON_SECRET;
export const DEFAULT_BRAND_COLOR = "#64748b";
export const FB_LOGO_URL =
  "https://s3.eu-central-1.amazonaws.com/listmonk-formbricks/Formbricks-Light-transparent.png";

export const PRIVACY_URL = env.PRIVACY_URL;
export const TERMS_URL = env.TERMS_URL;
export const IMPRINT_URL = env.IMPRINT_URL;
export const IMPRINT_ADDRESS = env.IMPRINT_ADDRESS;

export const PASSWORD_RESET_DISABLED = env.PASSWORD_RESET_DISABLED === "1";
export const EMAIL_VERIFICATION_DISABLED = env.EMAIL_VERIFICATION_DISABLED === "1";

export const GOOGLE_OAUTH_ENABLED = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const GITHUB_OAUTH_ENABLED = !!(env.GITHUB_ID && env.GITHUB_SECRET);
export const AZURE_OAUTH_ENABLED = !!(env.AZUREAD_CLIENT_ID && env.AZUREAD_CLIENT_SECRET);
export const OIDC_OAUTH_ENABLED = !!(env.OIDC_CLIENT_ID && env.OIDC_CLIENT_SECRET && env.OIDC_ISSUER);
export const SAML_OAUTH_ENABLED = !!env.SAML_DATABASE_URL;
export const SAML_XML_DIR = "./saml-connection";

export const GITHUB_ID = env.GITHUB_ID;
export const GITHUB_SECRET = env.GITHUB_SECRET;
export const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;

export const AZUREAD_CLIENT_ID = env.AZUREAD_CLIENT_ID;
export const AZUREAD_CLIENT_SECRET = env.AZUREAD_CLIENT_SECRET;
export const AZUREAD_TENANT_ID = env.AZUREAD_TENANT_ID;

export const OIDC_CLIENT_ID = env.OIDC_CLIENT_ID;
export const OIDC_CLIENT_SECRET = env.OIDC_CLIENT_SECRET;
export const OIDC_ISSUER = env.OIDC_ISSUER;
export const OIDC_DISPLAY_NAME = env.OIDC_DISPLAY_NAME;
export const OIDC_SIGNING_ALGORITHM = env.OIDC_SIGNING_ALGORITHM;

export const SAML_DATABASE_URL = env.SAML_DATABASE_URL;
export const SAML_TENANT = "formbricks.com";
export const SAML_PRODUCT = "formbricks";
export const SAML_AUDIENCE = "https://saml.formbricks.com";
export const SAML_PATH = "/api/auth/saml/callback";

export const SIGNUP_ENABLED = IS_FORMBRICKS_CLOUD || IS_DEVELOPMENT || E2E_TESTING;
export const EMAIL_AUTH_ENABLED = env.EMAIL_AUTH_DISABLED !== "1";
export const INVITE_DISABLED = env.INVITE_DISABLED === "1";

export const SLACK_CLIENT_SECRET = env.SLACK_CLIENT_SECRET;
export const SLACK_CLIENT_ID = env.SLACK_CLIENT_ID;
export const SLACK_AUTH_URL = `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=channels:read,chat:write,chat:write.public,chat:write.customize,groups:read`;

export const GOOGLE_SHEETS_CLIENT_ID = env.GOOGLE_SHEETS_CLIENT_ID;
export const GOOGLE_SHEETS_CLIENT_SECRET = env.GOOGLE_SHEETS_CLIENT_SECRET;
export const GOOGLE_SHEETS_REDIRECT_URL = env.GOOGLE_SHEETS_REDIRECT_URL;

export const NOTION_OAUTH_CLIENT_ID = env.NOTION_OAUTH_CLIENT_ID;
export const NOTION_OAUTH_CLIENT_SECRET = env.NOTION_OAUTH_CLIENT_SECRET;
export const NOTION_REDIRECT_URI = `${WEBAPP_URL}/api/v1/integrations/notion/callback`;
export const NOTION_AUTH_URL = `https://api.notion.com/v1/oauth/authorize?client_id=${env.NOTION_OAUTH_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${NOTION_REDIRECT_URI}`;

export const AIRTABLE_CLIENT_ID = env.AIRTABLE_CLIENT_ID;

export const SMTP_HOST = env.SMTP_HOST;
export const SMTP_PORT = env.SMTP_PORT;
export const SMTP_SECURE_ENABLED = env.SMTP_SECURE_ENABLED === "1" || env.SMTP_PORT === "465";
export const SMTP_USER = env.SMTP_USER;
export const SMTP_PASSWORD = env.SMTP_PASSWORD;
export const SMTP_AUTHENTICATED = env.SMTP_AUTHENTICATED !== "0";
export const SMTP_REJECT_UNAUTHORIZED_TLS = env.SMTP_REJECT_UNAUTHORIZED_TLS !== "0";
export const MAIL_FROM = env.MAIL_FROM;
export const MAIL_FROM_NAME = env.MAIL_FROM_NAME;

export const NEXTAUTH_SECRET = env.NEXTAUTH_SECRET;
export const ITEMS_PER_PAGE = 30;
export const SURVEYS_PER_PAGE = 12;
export const RESPONSES_PER_PAGE = 25;
export const TEXT_RESPONSES_PER_PAGE = 5;
export const MAX_RESPONSES_FOR_INSIGHT_GENERATION = 500;
export const MAX_OTHER_OPTION_LENGTH = 250;

export const SKIP_INVITE_FOR_SSO = env.AUTH_SKIP_INVITE_FOR_SSO === "1";
export const DEFAULT_TEAM_ID = env.AUTH_DEFAULT_TEAM_ID;

export const SLACK_MESSAGE_LIMIT = 2995;
export const GOOGLE_SHEET_MESSAGE_LIMIT = 49995;
export const AIRTABLE_MESSAGE_LIMIT = 99995;
export const NOTION_RICH_TEXT_LIMIT = 1995;

// Storage constants
export const S3_ACCESS_KEY = env.S3_ACCESS_KEY;
export const S3_SECRET_KEY = env.S3_SECRET_KEY;
export const S3_REGION = env.S3_REGION;
export const S3_ENDPOINT_URL = env.S3_ENDPOINT_URL;
export const S3_BUCKET_NAME = env.S3_BUCKET_NAME;
export const S3_FORCE_PATH_STYLE = env.S3_FORCE_PATH_STYLE === "1";
export const UPLOADS_DIR = env.UPLOADS_DIR ?? "./uploads";
export const MAX_SIZES = {
  standard: 1024 * 1024 * 10, // 10MB
  big: 1024 * 1024 * 1024, // 1GB
} as const;

// Function to check if the necessary S3 configuration is set up
export const isS3Configured = () => {
  // This function checks if the S3 bucket name environment variable is defined.
  // The AWS SDK automatically resolves credentials through a chain,
  // so we do not need to explicitly check for AWS credentials like access key, secret key, or region.
  return !!S3_BUCKET_NAME;
};

// Colors for Survey Bg
export const SURVEY_BG_COLORS = [
  "#FFFFFF",
  "#FFF2D8",
  "#EAD7BB",
  "#BCA37F",
  "#113946",
  "#04364A",
  "#176B87",
  "#64CCC5",
  "#DAFFFB",
  "#132043",
  "#1F4172",
  "#F1B4BB",
  "#FDF0F0",
  "#001524",
  "#445D48",
  "#D6CC99",
  "#FDE5D4",
  "#BEADFA",
  "#D0BFFF",
  "#DFCCFB",
  "#FFF8C9",
  "#FF8080",
  "#FFCF96",
  "#F6FDC3",
  "#CDFAD5",
];

// Rate Limiting
export const CLIENT_SIDE_API_RATE_LIMIT = {
  interval: 60, // 1 minute
  allowedPerInterval: 100,
};
export const MANAGEMENT_API_RATE_LIMIT = {
  interval: 60, // 1 minute
  allowedPerInterval: 100,
};
export const SYNC_USER_IDENTIFICATION_RATE_LIMIT = {
  interval: 60, // 1 minute
  allowedPerInterval: 5,
};

export const DEBUG = env.DEBUG === "1";

// Enterprise License constant
export const ENTERPRISE_LICENSE_KEY = env.ENTERPRISE_LICENSE_KEY;

export const REDIS_URL = env.REDIS_URL;
export const REDIS_HTTP_URL = env.REDIS_HTTP_URL;
export const RATE_LIMITING_DISABLED = env.RATE_LIMITING_DISABLED === "1";

export const BREVO_API_KEY = env.BREVO_API_KEY;
export const BREVO_LIST_ID = env.BREVO_LIST_ID;

export const UNSPLASH_ACCESS_KEY = env.UNSPLASH_ACCESS_KEY;
export const UNSPLASH_ALLOWED_DOMAINS = ["api.unsplash.com"];

export const STRIPE_API_VERSION = "2024-06-20";

// Maximum number of attribute classes allowed:
export const MAX_ATTRIBUTE_CLASSES_PER_ENVIRONMENT = 150;

export const DEFAULT_LOCALE = "en-US";
export const AVAILABLE_LOCALES: TUserLocale[] = ["en-US", "de-DE", "pt-BR", "fr-FR", "zh-Hant-TW", "pt-PT"];

// Billing constants

export enum PROJECT_FEATURE_KEYS {
  FREE = "free",
  STARTUP = "startup",
  SCALE = "scale",
  ENTERPRISE = "enterprise",
}

export enum STRIPE_PROJECT_NAMES {
  STARTUP = "Formbricks Startup",
  SCALE = "Formbricks Scale",
  ENTERPRISE = "Formbricks Enterprise",
}

export enum STRIPE_PRICE_LOOKUP_KEYS {
  STARTUP_MAY25_MONTHLY = "STARTUP_MAY25_MONTHLY",
  STARTUP_MAY25_YEARLY = "STARTUP_MAY25_YEARLY",
  SCALE_MONTHLY = "formbricks_scale_monthly",
  SCALE_YEARLY = "formbricks_scale_yearly",
}

export const BILLING_LIMITS = {
  FREE: {
    PROJECTS: 3,
    RESPONSES: 1500,
    MIU: 2000,
  },
  STARTUP: {
    PROJECTS: 3,
    RESPONSES: 5000,
    MIU: 7500,
  },
  SCALE: {
    PROJECTS: 5,
    RESPONSES: 10000,
    MIU: 30000,
  },
} as const;

export const INTERCOM_SECRET_KEY = env.INTERCOM_SECRET_KEY;
export const INTERCOM_APP_ID = env.INTERCOM_APP_ID;
export const IS_INTERCOM_CONFIGURED = Boolean(env.INTERCOM_APP_ID && INTERCOM_SECRET_KEY);

export const POSTHOG_API_KEY = env.POSTHOG_API_KEY;
export const POSTHOG_API_HOST = env.POSTHOG_API_HOST;
export const IS_POSTHOG_CONFIGURED = Boolean(POSTHOG_API_KEY && POSTHOG_API_HOST);

export const TURNSTILE_SECRET_KEY = env.TURNSTILE_SECRET_KEY;
export const TURNSTILE_SITE_KEY = env.TURNSTILE_SITE_KEY;
export const IS_TURNSTILE_CONFIGURED = Boolean(env.TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY);

export const RECAPTCHA_SITE_KEY = env.RECAPTCHA_SITE_KEY;
export const RECAPTCHA_SECRET_KEY = env.RECAPTCHA_SECRET_KEY;
export const IS_RECAPTCHA_CONFIGURED = Boolean(RECAPTCHA_SITE_KEY && RECAPTCHA_SECRET_KEY);

// Use the app version for Sentry release (updated during build in production)
// Fallback to environment variable if package.json is not accessible
export const SENTRY_RELEASE = (() => {
  if (process.env.NODE_ENV !== "production") {
    return undefined;
  }

  // Try to read from package.json with proper error handling
  try {
    const pkg = require("../package.json");
    return pkg.version === "0.0.0" ? undefined : `v${pkg.version}`;
  } catch {
    // If package.json can't be read (e.g., in some deployment scenarios),
    // return undefined and let Sentry work without release tracking
    return undefined;
  }
})();
export const SENTRY_ENVIRONMENT = env.SENTRY_ENVIRONMENT;
export const SENTRY_DSN = env.SENTRY_DSN;

export const PROMETHEUS_ENABLED = env.PROMETHEUS_ENABLED === "1";

export const USER_MANAGEMENT_MINIMUM_ROLE = env.USER_MANAGEMENT_MINIMUM_ROLE ?? "manager";

export const AUDIT_LOG_ENABLED = env.AUDIT_LOG_ENABLED === "1";
export const AUDIT_LOG_GET_USER_IP = env.AUDIT_LOG_GET_USER_IP === "1";
export const SESSION_MAX_AGE = Number(env.SESSION_MAX_AGE) || 86400;

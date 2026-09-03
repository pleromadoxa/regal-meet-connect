/** Regal Mail product constants — shared across Regal ecosystem apps */
export const REGAL_MAIL_DOMAIN = 'regalmail.me' as const;
export const REGAL_MAIL_WEB_URL = 'https://www.regalmail.me' as const;
export const REGAL_MAIL_SIGNUP_URL = `${REGAL_MAIL_WEB_URL}/signup` as const;
export const REGAL_MAIL_LOGO_SRC = '/regal-mail-logo.png' as const;
export const REGAL_MAIL_LOGO_ALT = 'Regal Mail' as const;

/** Shared Supabase project with Regal Email Client */
export const REGAL_MAIL_SUPABASE_PROJECT_REF = 'xexnwcmqnelgzuqhkvtx' as const;
export const REGAL_MAIL_SUPABASE_URL =
  `https://${REGAL_MAIL_SUPABASE_PROJECT_REF}.supabase.co` as const;

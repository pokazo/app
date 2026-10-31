/** Keep in sync with apps/api/src/topic-limits.ts */
export const TOPIC_MIN_CHARS = 5;
export const TOPIC_MAX_CHARS = 4000;

/** Encoded topic longer than this goes via sessionStorage (OAuth/URL length). */
export const TOPIC_URL_SAFE_ENCODED = 1500;

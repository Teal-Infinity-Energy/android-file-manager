// Deep link schemes that should NOT be loaded in iframe
const DEEP_LINK_SCHEMES = [
  'whatsapp://',
  'telegram://',
  'tg://',
  'signal://',
  'sgnl://',
  'slack://',
  'spotify://',
  'youtube://',
  'vnd.youtube:',
  'twitter://',
  'x://',
  'instagram://',
  'fb://',
  'messenger://',
  'snapchat://',
  'tiktok://',
  'linkedin://',
  'reddit://',
  'discord://',
  'zoom://',
  'tel:',
  'sms:',
  'mailto:',
  'geo:',
  'maps:',
  'intent://',
  'market://',
];

// Web URLs that typically redirect to apps
const APP_REDIRECT_PATTERNS = [
  'wa.me',
  't.me',
  'open.spotify.com',
  'music.apple.com',
];

/**
 * Check if URL is a deep link (non-web URL that opens apps directly)
 */
export function isDeepLink(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  
  // Check against known deep link schemes
  if (DEEP_LINK_SCHEMES.some(scheme => lowerUrl.startsWith(scheme))) {
    return true;
  }
  
  // Check if it's NOT a standard web URL but has a scheme
  if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
    // Has a scheme but not http/https = likely a deep link
    if (lowerUrl.includes('://') || lowerUrl.startsWith('tel:') || lowerUrl.startsWith('mailto:') || lowerUrl.startsWith('sms:')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if URL is a web URL that typically redirects to an app
 * These can be loaded in iframe but user should know they work better externally
 */
export function isAppRedirectUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return APP_REDIRECT_PATTERNS.some(pattern => lowerUrl.includes(pattern));
}

/**
 * Get a friendly app name from the URL for display purposes
 */
export function getAppNameFromUrl(url: string): string | null {
  const lowerUrl = url.toLowerCase();
  
  const appMap: Record<string, string> = {
    'whatsapp://': 'WhatsApp',
    'wa.me': 'WhatsApp',
    'telegram://': 'Telegram',
    'tg://': 'Telegram',
    't.me': 'Telegram',
    'signal://': 'Signal',
    'sgnl://': 'Signal',
    'spotify://': 'Spotify',
    'open.spotify.com': 'Spotify',
    'youtube://': 'YouTube',
    'youtu.be': 'YouTube',
    'youtube.com': 'YouTube',
    'twitter://': 'Twitter/X',
    'x://': 'Twitter/X',
    'twitter.com': 'Twitter/X',
    'x.com': 'Twitter/X',
    'instagram://': 'Instagram',
    'instagram.com': 'Instagram',
    'fb://': 'Facebook',
    'facebook.com': 'Facebook',
    'messenger://': 'Messenger',
    'slack://': 'Slack',
    'zoom://': 'Zoom',
    'zoom.us': 'Zoom',
    'discord://': 'Discord',
    'discord.com': 'Discord',
    'discord.gg': 'Discord',
    'linkedin://': 'LinkedIn',
    'linkedin.com': 'LinkedIn',
    'reddit://': 'Reddit',
    'reddit.com': 'Reddit',
    'tiktok://': 'TikTok',
    'tiktok.com': 'TikTok',
    'music.apple.com': 'Apple Music',
    'tel:': 'Phone',
    'mailto:': 'Email',
    'sms:': 'Messages',
  };
  
  for (const [pattern, name] of Object.entries(appMap)) {
    if (lowerUrl.includes(pattern)) {
      return name;
    }
  }
  
  return null;
}

/**
 * Check if a URL can be safely loaded in an iframe
 * Returns false for deep links that would try to open external apps
 */
export function canLoadInIframe(url: string): boolean {
  return !isDeepLink(url);
}

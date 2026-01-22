import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetadataResponse {
  title: string | null;
  favicon: string | null;
  domain: string;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function extractTitle(html: string): string | null {
  // Try og:title first
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitleMatch?.[1]) {
    return ogTitleMatch[1].trim();
  }
  
  // Try twitter:title
  const twitterTitleMatch = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
  if (twitterTitleMatch?.[1]) {
    return twitterTitleMatch[1].trim();
  }
  
  // Fall back to <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    return titleMatch[1].trim();
  }
  
  return null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  try {
    const urlObj = new URL(baseUrl);
    const origin = urlObj.origin;
    
    // Try apple-touch-icon first (higher quality)
    const appleTouchMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
    if (appleTouchMatch?.[1]) {
      const href = appleTouchMatch[1];
      return href.startsWith('http') ? href : new URL(href, origin).href;
    }
    
    // Try icon with sizes
    const iconSizesMatch = html.match(/<link[^>]*rel=["']icon["'][^>]*sizes=["'](\d+)x\d+["'][^>]*href=["']([^"']+)["']/i);
    if (iconSizesMatch?.[2]) {
      const href = iconSizesMatch[2];
      return href.startsWith('http') ? href : new URL(href, origin).href;
    }
    
    // Try shortcut icon
    const shortcutMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
    if (shortcutMatch?.[1]) {
      const href = shortcutMatch[1];
      return href.startsWith('http') ? href : new URL(href, origin).href;
    }
    
    // Fall back to Google Favicons service
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
  } catch {
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const domain = extractDomain(url);
    
    // Try to fetch the page
    let title: string | null = null;
    let favicon: string | null = null;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OneTapBot/1.0)',
          'Accept': 'text/html',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const html = await response.text();
        title = extractTitle(html);
        favicon = extractFavicon(html, url);
      }
    } catch (fetchError) {
      console.log('[fetch-url-metadata] Failed to fetch URL:', fetchError);
      // Use Google Favicons as fallback
      try {
        const urlObj = new URL(url);
        favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
      } catch {
        // Ignore
      }
    }

    const result: MetadataResponse = {
      title,
      favicon,
      domain,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[fetch-url-metadata] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch metadata' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

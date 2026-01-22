import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UrlMetadata {
  title: string | null;
  favicon: string | null;
  domain: string;
}

interface UseUrlMetadataResult {
  metadata: UrlMetadata | null;
  isLoading: boolean;
  error: string | null;
}

// Simple in-memory cache for this session
const metadataCache = new Map<string, UrlMetadata>();

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function useUrlMetadata(url: string | null): UseUrlMetadataResult {
  const [metadata, setMetadata] = useState<UrlMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url) {
      setMetadata(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Check cache first
    const cached = metadataCache.get(url);
    if (cached) {
      setMetadata(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Set initial domain-based metadata immediately for fast UI
    const domain = extractDomain(url);
    setMetadata({
      title: null,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      domain,
    });

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchMetadata = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('fetch-url-metadata', {
          body: { url },
        });

        if (controller.signal.aborted) return;

        if (fnError) {
          console.error('[useUrlMetadata] Function error:', fnError);
          setError('Failed to fetch metadata');
          return;
        }

        const result: UrlMetadata = {
          title: data?.title || null,
          favicon: data?.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          domain: data?.domain || domain,
        };

        // Cache the result
        metadataCache.set(url, result);
        setMetadata(result);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('[useUrlMetadata] Error:', err);
        setError('Failed to fetch metadata');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      controller.abort();
    };
  }, [url]);

  return { metadata, isLoading, error };
}

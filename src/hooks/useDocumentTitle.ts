import { useEffect } from 'react';
import { PRODUCT_NAME } from '@/constants/site';

const DEFAULT_TITLE = `${PRODUCT_NAME} — Premium Video Conferencing`;

export function useDocumentTitle(pageTitle?: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = pageTitle ? `${pageTitle} · ${PRODUCT_NAME}` : DEFAULT_TITLE;
    return () => {
      document.title = previous;
    };
  }, [pageTitle]);
}

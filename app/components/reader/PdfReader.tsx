'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import styles from './PdfReader.module.css';

import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfReaderProps {
  fileUrl: string;
  pageIndex: number;
  fitToPage: boolean;
  isRtl?: boolean;
  onPageChange: (pageIndex: number) => void;
  onDocumentLoad: (pageCount: number) => void;
  onSpreadSizeChange?: (pagesPerSpread: number) => void;
}

export default function PdfReader({
  fileUrl,
  pageIndex,
  fitToPage,
  isRtl = false,
  onPageChange,
  onDocumentLoad,
  onSpreadSizeChange,
}: PdfReaderProps) {
  const readerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const lastTurnAt = useRef(0);
  const previousPageIndex = useRef(pageIndex);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [pageCount, setPageCount] = useState(0);
  const [pageAspectRatio, setPageAspectRatio] = useState(0.707);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [turnDirection, setTurnDirection] = useState<'forward' | 'backward' | null>(null);

  useEffect(() => {
    const reader = readerRef.current;
    if (!reader) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    resizeObserver.observe(reader);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const reader = readerRef.current;
    if (!reader) return;
    reader.scrollTop = 0;
  }, [fileUrl, pageIndex]);

  useEffect(() => {
    const previousIndex = previousPageIndex.current;
    previousPageIndex.current = pageIndex;
    if (previousIndex === pageIndex) return;

    setTurnDirection(pageIndex > previousIndex ? 'forward' : 'backward');
    const timeoutId = window.setTimeout(() => setTurnDirection(null), 900);
    return () => window.clearTimeout(timeoutId);
  }, [pageIndex]);

  const handleDocumentLoad = useCallback((document: PDFDocumentProxy) => {
    setPageCount(document.numPages);
    setLoadError(null);
    onDocumentLoad(document.numPages);
  }, [onDocumentLoad]);

  const turnPage = useCallback((direction: -1 | 1) => {
    if (!pageCount || Date.now() - lastTurnAt.current < 250) return;

    const nextPage = Math.max(0, Math.min(pageIndex + direction, pageCount - 1));
    if (nextPage !== pageIndex) {
      lastTurnAt.current = Date.now();
      onPageChange(nextPage);
    }
  }, [onPageChange, pageCount, pageIndex]);

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startY = touchStartY.current;
    touchStartY.current = null;
    if (startY === null) return;

    const deltaY = startY - event.changedTouches[0].clientY;
    if (Math.abs(deltaY) > 48) {
      const reader = readerRef.current;
      const atTop = !reader || reader.scrollTop <= 0;
      const atBottom = !reader ||
        reader.scrollTop + reader.clientHeight >= reader.scrollHeight - 1;
      if ((deltaY > 0 && !atBottom) || (deltaY < 0 && !atTop)) {
        if (reader) reader.scrollTop += deltaY;
        return;
      }

      turnPage(deltaY > 0 ? 1 : -1);
    }
  };

  const pagesPerSpread = dimensions.width >= 760 ? 2 : 1;
  useEffect(() => {
    onSpreadSizeChange?.(pagesPerSpread);
  }, [onSpreadSizeChange, pagesPerSpread]);

  const pageGap = pagesPerSpread === 2 ? 24 : 0;
  const availableWidth = Math.max(1, dimensions.width - 48 - pageGap);
  const pageWidth = fitToPage
    ? Math.max(1, Math.min(availableWidth / pagesPerSpread, (dimensions.height - 32) / pageAspectRatio))
    : Math.max(1, Math.min(600, availableWidth / pagesPerSpread));
  return (
    <div
      ref={readerRef}
      className={`${styles.reader} ${fitToPage ? styles.fitToPage : ''}`}
      onTouchStart={(event) => {
        touchStartY.current = event.touches[0].clientY;
      }}
      onTouchEnd={handleTouchEnd}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'PageDown') {
          event.preventDefault();
          turnPage(1);
        } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
          event.preventDefault();
          turnPage(-1);
        }
      }}
      role="region"
      tabIndex={0}
      aria-label="PDF reader. Scroll or swipe vertically to turn pages."
    >
      {loadError ? (
        <div className={styles.message} role="alert">{loadError}</div>
      ) : (
        <Document
          file={fileUrl}
          onLoadSuccess={handleDocumentLoad}
          onLoadError={(error) => {
            console.error('Error loading PDF:', error);
            setLoadError('Unable to load this PDF. Check your connection or open the file directly.');
          }}
          loading={<div className={styles.message}>Loading PDF...</div>}
        >
          {pageCount > 0 && (
            <div
              className={[
                styles.spread,
                isRtl ? styles.rtl : '',
                pagesPerSpread === 2 && pageIndex + 1 < pageCount ? styles.twoPageSpread : '',
                pagesPerSpread === 2 && turnDirection === 'forward' ? styles.forwardTurn : '',
                pagesPerSpread === 2 && turnDirection === 'backward' ? styles.backwardTurn : '',
              ].filter(Boolean).join(' ')}
              aria-live="polite"
            >
              <Page
                pageNumber={pageIndex + 1}
                width={pageWidth}
                onLoadSuccess={(page: PDFPageProxy) => {
                  const viewport = page.getViewport({ scale: 1 });
                  setPageAspectRatio(viewport.height / viewport.width);
                }}
                renderTextLayer
                renderAnnotationLayer
                loading={<div className={styles.message}>Rendering page...</div>}
              />
              {pagesPerSpread === 2 && pageIndex + 1 < pageCount && (
                <Page
                  pageNumber={pageIndex + 2}
                  width={pageWidth}
                  renderTextLayer
                  renderAnnotationLayer
                  loading={<div className={styles.message}>Rendering page...</div>}
                />
              )}
            </div>
          )}
        </Document>
      )}
    </div>
  );
}

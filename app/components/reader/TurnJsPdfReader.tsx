'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import styles from './TurnJsPdfReader.module.css';
import { loadTurnLibrary } from './turnJsRuntime';
import type { TurnBookInstance, TurnDisplay, TurnJQuery } from './turnJsRuntime';

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

interface MountedPdfPage {
  pageNumber: number;
  element: HTMLDivElement;
}

export default function TurnJsPdfReader({
  fileUrl,
  pageIndex,
  fitToPage,
  isRtl = false,
  onPageChange,
  onDocumentLoad,
  onSpreadSizeChange,
}: PdfReaderProps) {
  const readerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<TurnBookInstance | null>(null);
  const pageElementsRef = useRef(new Map<number, HTMLDivElement>());
  const pageChangeRef = useRef(onPageChange);
  const documentLoadRef = useRef(onDocumentLoad);
  const spreadSizeChangeRef = useRef(onSpreadSizeChange);
  const pageIndexRef = useRef(pageIndex);
  const bookSizeRef = useRef({ width: 0, height: 0, display: 'single' as TurnDisplay, pagesPerSpread: 1 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hasMeasured, setHasMeasured] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [documentProxy, setDocumentProxy] = useState<PDFDocumentProxy | null>(null);
  const [pageAspectRatio, setPageAspectRatio] = useState(0.707);
  const [mountedPages, setMountedPages] = useState<MountedPdfPage[]>([]);
  const [library, setLibrary] = useState<TurnJQuery | null>(null);
  const [turnReady, setTurnReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [turnError, setTurnError] = useState<string | null>(null);

  pageChangeRef.current = onPageChange;
  documentLoadRef.current = onDocumentLoad;
  spreadSizeChangeRef.current = onSpreadSizeChange;
  pageIndexRef.current = pageIndex;

  useEffect(() => {
    let active = true;
    loadTurnLibrary().then((jquery) => {
      if (active) setLibrary(jquery);
    }).catch((error: unknown) => {
      console.error('Failed to load Turn.js for PDF reading:', error);
      if (active) setTurnError('The page-turn reader could not be loaded.');
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const reader = readerRef.current;
    if (!reader) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
      setHasMeasured(true);
    });
    resizeObserver.observe(reader);
    return () => resizeObserver.disconnect();
  }, []);

  const handleDocumentLoad = useCallback((document: PDFDocumentProxy) => {
    setPageCount(document.numPages);
    setDocumentProxy(document);
    setLoadError(null);
    documentLoadRef.current(document.numPages);
  }, []);

  const pagesPerSpread = dimensions.width >= 760 ? 2 : 1;
  const display: TurnDisplay = pagesPerSpread === 2 ? 'double' : 'single';
  const pageGap = pagesPerSpread === 2 ? 24 : 0;
  const availableWidth = Math.max(1, dimensions.width - 48 - pageGap);
  const availableHeight = Math.max(1, dimensions.height - 32);
  const pageWidth = Math.max(1, Math.min(
    availableWidth / pagesPerSpread,
    availableHeight / pageAspectRatio,
    fitToPage ? 800 : 600,
  ));
  const bookWidth = pageWidth * pagesPerSpread;
  const bookHeight = pageWidth * pageAspectRatio;
  bookSizeRef.current = { width: bookWidth, height: bookHeight, display, pagesPerSpread };

  useEffect(() => {
    const book = bookRef.current;
    if (!library || !documentProxy || !pageCount || !book || !hasMeasured) return;

    book.replaceChildren();
    pageElementsRef.current.clear();
    setMountedPages([]);
    setTurnReady(false);

    const size = bookSizeRef.current;
    const instance = library(book);
    instanceRef.current = instance;

    const addMissingPages = (pageNumbers: number[]) => {
      const newPages: MountedPdfPage[] = [];
      pageNumbers.forEach((number) => {
        if (number < 1 || number > pageCount || pageElementsRef.current.has(number)) return;
        const element = document.createElement('div');
        element.className = styles.pdfTurnPage;
        element.dataset.readerPage = String(number);
        element.dir = isRtl ? 'rtl' : 'ltr';
        pageElementsRef.current.set(number, element);
        instance.turn('addPage', element, number);
        newPages.push({ pageNumber: number, element });
      });

      if (newPages.length) {
        setMountedPages((existing) => [...existing, ...newPages]);
      }
    };

    book.style.width = `${size.width}px`;
    book.style.height = `${size.height}px`;
    try {
      instance.turn({
        width: size.width,
        height: size.height,
        display: size.display,
        direction: isRtl ? 'rtl' : 'ltr',
        duration: 1500,
        acceleration: true,
        gradients: true,
        elevation: 80,
        autoCenter: true,
        turnCorners: 'bl,br,tl,tr',
        page: Math.min(pageCount, Math.max(1, pageIndexRef.current + 1)),
        pages: pageCount,
        when: {
          turned: (_event, page) => {
            const nextPage = Math.max(0, Math.min(page - 1, pageCount - 1));
            if (nextPage !== pageIndexRef.current) {
              pageChangeRef.current(nextPage);
            }
          },
          missing: (_event, pages) => addMissingPages(pages),
        },
      });
      spreadSizeChangeRef.current?.(size.pagesPerSpread);
      setTurnReady(true);
    } catch (error) {
      console.error('Failed to initialize the Turn.js PDF reader:', error);
      setTurnError('The PDF page-turn reader could not be initialized.');
    }

    return () => {
      if (instanceRef.current === instance) {
        instance.turn('destroy');
        instanceRef.current = null;
      }
      pageElementsRef.current.clear();
      book.replaceChildren();
    };
  }, [
    hasMeasured,
    documentProxy,
    isRtl,
    library,
    pageCount,
  ]);

  useEffect(() => {
    const instance = instanceRef.current;
    const book = bookRef.current;
    if (!turnReady || !instance || !book || bookWidth < 1 || bookHeight < 1) return;
    book.style.width = `${bookWidth}px`;
    book.style.height = `${bookHeight}px`;
    instance.turn('display', display);
    instance.turn('size', bookWidth, bookHeight);
    spreadSizeChangeRef.current?.(pagesPerSpread);
  }, [bookHeight, bookWidth, display, pagesPerSpread, turnReady]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!turnReady || !instance || !pageCount) return;
    const targetPage = Math.min(pageCount, Math.max(1, pageIndex + 1));
    if (instance.turn('page') !== targetPage) {
      instance.turn('page', targetPage);
    }
  }, [pageCount, pageIndex, turnReady]);

  const handlePageLoad = useCallback((page: PDFPageProxy) => {
    if (page.pageNumber !== 1) return;
    const viewport = page.getViewport({ scale: 1 });
    setPageAspectRatio(viewport.height / viewport.width);
  }, []);

  return (
    <div
      ref={readerRef}
      className={`${styles.reader} ${fitToPage ? styles.fitToPage : ''}`}
      role="region"
      tabIndex={0}
      aria-label="PDF reader. Drag a page corner to turn pages."
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'PageDown') {
          event.preventDefault();
          pageChangeRef.current(Math.min(pageIndexRef.current + pagesPerSpread, pageCount - 1));
        } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
          event.preventDefault();
          pageChangeRef.current(Math.max(0, pageIndexRef.current - pagesPerSpread));
        }
      }}
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
          <div
            ref={bookRef}
            className={styles.turnBook}
            style={{ width: bookWidth, height: bookHeight }}
          />
          {mountedPages.map(({ pageNumber, element }) => createPortal(
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              className={styles.pdfPage}
              onLoadSuccess={handlePageLoad}
              renderTextLayer
              renderAnnotationLayer
              loading={<div className={styles.message}>Rendering page...</div>}
            />,
            element,
            `pdf-page-${pageNumber}`,
          ))}
          {turnError && <div className={styles.message} role="alert">{turnError}</div>}
          {!turnReady && !turnError && pageCount > 0 && (
            <div className={styles.message}>Preparing page-turn reader...</div>
          )}
        </Document>
      )}
    </div>
  );
}

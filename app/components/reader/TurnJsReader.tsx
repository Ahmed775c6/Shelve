'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './TurnJsReader.module.css';
import { loadTurnLibrary } from './turnJsRuntime';
import type { TurnBookInstance, TurnDisplay, TurnJQuery } from './turnJsRuntime';

interface TurnJsReaderProps {
  title: string;
  author: string;
  content: string;
  maxPages: number;
  currentPage: number;
  fontSize: number;
  isRtl: boolean;
  theme: 'light' | 'dark' | 'sepia';
  onPageChange: (pageIndex: number) => void;
  onPageCountChange: (pageCount: number) => void;
  onDisplayChange: (pagesPerView: number) => void;
}

function paginateContent(content: string, pageLimit: number) {
  const paragraphs = content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const pages: string[] = [];
  let page = '';

  const addText = (text: string) => {
    if (page && page.length + text.length + 2 > pageLimit) {
      pages.push(page);
      page = '';
    }
    page = page ? `${page}\n\n${text}` : text;
  };

  paragraphs.forEach((paragraph) => {
    let remaining = paragraph;
    while (remaining.length > pageLimit) {
      let splitAt = remaining.lastIndexOf(' ', pageLimit);
      if (splitAt < 1) splitAt = pageLimit;
      addText(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt).trimStart();
    }
    addText(remaining);
  });

  if (page) pages.push(page);
  return pages.length > 0 ? pages : [''];
}

function createPage(
  root: HTMLElement,
  pageNumber: number,
  content: string,
  title: string,
  author: string,
  fontSize: number,
  isRtl: boolean,
  theme: TurnJsReaderProps['theme'],
) {
  const page = document.createElement('article');
  page.className = `${styles.page} ${styles[theme]}`;
  page.dataset.readerPage = String(pageNumber);
  page.dir = isRtl ? 'rtl' : 'ltr';
  page.style.fontSize = `${fontSize}px`;

  const heading = document.createElement('header');
  heading.className = styles.heading;
  const titleElement = document.createElement('h2');
  titleElement.textContent = title;
  heading.appendChild(titleElement);
  if (pageNumber === 1 && author) {
    const authorElement = document.createElement('p');
    authorElement.textContent = author;
    heading.appendChild(authorElement);
  }
  page.appendChild(heading);

  const body = document.createElement('div');
  body.className = styles.body;
  content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean).forEach((paragraph) => {
    const element = document.createElement('p');
    element.textContent = paragraph;
    body.appendChild(element);
  });
  page.appendChild(body);

  const footer = document.createElement('footer');
  footer.textContent = String(pageNumber);
  page.appendChild(footer);

  root.appendChild(page);
}

export default function TurnJsReader({
  title,
  author,
  content,
  maxPages,
  currentPage,
  fontSize,
  isRtl,
  theme,
  onPageChange,
  onPageCountChange,
  onDisplayChange,
}: TurnJsReaderProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<TurnBookInstance | null>(null);
  const pageChangeRef = useRef(onPageChange);
  const pageCountChangeRef = useRef(onPageCountChange);
  const displayChangeRef = useRef(onDisplayChange);
  const currentPageRef = useRef(currentPage);
  const [library, setLibrary] = useState<TurnJQuery | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const pages = useMemo(() => paginateContent(content, 2000), [content]);
  const pageCount = Math.max(2, maxPages, pages.length);

  pageChangeRef.current = onPageChange;
  pageCountChangeRef.current = onPageCountChange;
  displayChangeRef.current = onDisplayChange;
  currentPageRef.current = currentPage;

  useEffect(() => {
    let active = true;
    loadTurnLibrary().then((jquery) => {
      if (active) setLibrary(jquery);
    }).catch((loadError: unknown) => {
      console.error('Failed to load Turn.js:', loadError);
      if (active) {
        setError('The page-turn reader could not be loaded.');
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const root = bookRef.current;
    const viewport = viewportRef.current;
    if (!library || !root || !viewport) return;

    root.replaceChildren();
    for (let index = 0; index < pageCount; index += 1) {
      createPage(
        root,
        index + 1,
        pages[index] || '',
        title,
        author,
        fontSize,
        isRtl,
        theme,
      );
    }

    const getBookSize = () => {
      const viewportWidth = viewport.clientWidth;
      const viewportHeight = viewport.clientHeight;
      const display: TurnDisplay = viewportWidth < 720 ? 'single' : 'double';
      const ratio = display === 'double' ? 1.62 : 0.72;
      const width = Math.max(280, Math.min(
        display === 'double' ? 1180 : 560,
        viewportWidth - 36,
        (viewportHeight - 44) * ratio,
      ));
      const height = Math.max(340, Math.min(viewportHeight - 44, width / ratio, 820));
      return { width, height, display };
    };

    const initialSize = getBookSize();
    root.style.width = `${initialSize.width}px`;
    root.style.height = `${initialSize.height}px`;
    const instance = library(root);
    instanceRef.current = instance;
    instance.turn({
      ...initialSize,
      direction: isRtl ? 'rtl' : 'ltr',
      duration: 1500,
      acceleration: true,
      gradients: true,
      elevation: 80,
      autoCenter: true,
      turnCorners: 'bl,br,tl,tr',
      page: Math.min(pageCount, Math.max(1, currentPage + 1)),
      when: {
        turned: (_event, page) => {
          const nextPage = Math.max(0, Math.min(page - 1, pageCount - 1));
          if (nextPage !== currentPageRef.current) {
            pageChangeRef.current(nextPage);
          }
        },
      },
    });

    pageCountChangeRef.current(pageCount);
    displayChangeRef.current(initialSize.display === 'double' ? 2 : 1);
    setReady(true);

    const resizeObserver = new ResizeObserver(() => {
      const size = getBookSize();
      root.style.width = `${size.width}px`;
      root.style.height = `${size.height}px`;
      instance.turn('display', size.display);
      instance.turn('size', size.width, size.height);
      displayChangeRef.current(size.display === 'double' ? 2 : 1);
    });
    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
      if (instanceRef.current === instance) {
        instance.turn('destroy');
        instanceRef.current = null;
      }
      root.replaceChildren();
    };
  }, [author, fontSize, isRtl, library, pageCount, pages, theme, title]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!ready || !instance) return;
    const targetPage = Math.min(pageCount, Math.max(1, currentPage + 1));
    if (instance.turn('page') !== targetPage) {
      instance.turn('page', targetPage);
    }
  }, [currentPage, pageCount, ready]);

  return (
    <div ref={viewportRef} className={styles.viewport}>
      <div ref={bookRef} className={styles.book} aria-label={`Book pages for ${title}`} />
      {error ? (
        <div className={styles.error} role="alert">{error}</div>
      ) : !ready ? (
        <div className={styles.loading}>Preparing page-turn reader...</div>
      ) : (
        <div className={styles.hint}>Drag a page corner to turn the page</div>
      )}
    </div>
  );
}

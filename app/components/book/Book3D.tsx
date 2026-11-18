'use client';

import { useState } from 'react';

interface Book3DProps {
  title: string;
  author: string;
  coverColor: string;
  coverImage?: string;
  description?: string;
  category?: string;
  publishedYear?: number;
  pages?: number;
  progress?: number;
}

export default function Book3D({
  title,
  author,
  coverColor,
  coverImage,
  description,
  category,
  publishedYear,
  pages,
  progress = 0,
}: Book3DProps) {
  const [flipped, setFlipped] = useState(false);
  const circumference = 50.27;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="w-fit h-fit  cursor-pointer" onClick={(event) => {
      event.stopPropagation();
      setFlipped((value) => !value);
    }}>
      <div className="book-3d-wrap relative mb-3 h-[205px] w-[190px]">
        <div className={`book-3d ${flipped ? 'is-flipped' : ''}`}>
          <div className="book-front-cover">
            <div className={`book-front-half book-front-left ${!coverImage ? coverColor : ''}`}>
              {coverImage && <img src={coverImage} alt="" />}
            </div>
            <div className={`book-front-half book-front-right ${!coverImage ? coverColor : ''}`}>
              {coverImage && <img src={coverImage} alt={title} />}
            </div>

            {!coverImage && (
              <div className="book-cover-design">
                <div className="book-cover-line-left" />
                <div className="book-cover-line-right" />
                <div className="book-cover-title">
                  <span>{title}</span>
                  <small>by {author}</small>
                </div>
              </div>
            )}

            {progress > 0 && (
              <svg className="absolute top-1.5 right-1.5 w-5 h-5 z-20" viewBox="0 0 22 22">
                <circle cx="11" cy="11" r="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5"/>
                <circle cx="11" cy="11" r="8" fill="none" stroke="rgba(245, 168, 35, 0.85)" strokeWidth="2.5"
                  strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                  transform="rotate(-90 11 11)"/>
              </svg>
            )}
          </div>

          <div className="book-middle-left" />
          <div className="book-middle-right" />
          <div className="book-middle-top" />
          <div className="book-page-bottom" />

          <div className={`book-back-cover ${coverColor}`}>
            <span className="book-back-eyebrow">Book details</span>
            <strong>{title}</strong>
            <small>{author}</small>
            <dl className="book-back-meta">
              {category && <div><dt>Category</dt><dd>{category}</dd></div>}
              {publishedYear && <div><dt>Published</dt><dd>{publishedYear}</dd></div>}
              {pages ? <div><dt>Pages</dt><dd>{pages}</dd></div> : null}
            </dl>
            <p>{description || 'A story waiting to be discovered.'}</p>
          </div>
        </div>
      </div>
  
    </div>
  );
}
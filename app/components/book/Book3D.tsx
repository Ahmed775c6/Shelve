'use client';

interface Book3DProps {
  title: string;
  author: string;
  coverColor: string;
  coverImage?: string;
  progress?: number;
  onClick?: () => void;
}

export default function Book3D({ title, author, coverColor, coverImage, progress = 0, onClick }: Book3DProps) {
  const circumference = 50.27;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="book-item cursor-pointer" onClick={onClick}>
      <div className="book-3d-wrap w-20 h-[120px] relative mb-2.5">
        <div className="book-3d w-[70px] h-[116px] transform-style-3d transform -rotate-y-15 transition-transform duration-300 hover:rotate-y-5 hover:translate-x-1">
          <div className={`book-face absolute w-[70px] h-[116px] rounded-[2px_5px_5px_2px] backface-hidden flex flex-col justify-end p-2 overflow-hidden ${!coverImage ? coverColor : ''}`}>
            {coverImage && (
              <img 
                src={coverImage} 
                alt={title} 
                className="absolute inset-0 w-full h-full object-cover rounded-[2px_5px_5px_2px]"
              />
            )}
            {progress > 0 && (
              <svg className="absolute top-1.5 right-1.5 w-5 h-5 z-10" viewBox="0 0 22 22">
                <circle cx="11" cy="11" r="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5"/>
                <circle cx="11" cy="11" r="8" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" 
                  strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" 
                  transform="rotate(-90 11 11)"/>
              </svg>
            )}
            {!coverImage && (
              <div className="book-face-title text-[9px] text-white/85 font-medium leading-tight relative z-5">
                {title}
              </div>
            )}
          </div>
          <div className="book-spine-3d absolute -left-[9px] top-0 w-2.5 h-[116px] transform rotate-y-90 origin-right backface-hidden rounded-l-[2px]"></div>
        </div>
      </div>
      <div className="book-meta">
        <div className="book-title text-xs font-medium text-[#f0ede8] leading-tight max-w-[80px]">
          {title}
        </div>
        <div className="book-author-sm text-[10px] text-[#5c5a56] max-w-[80px] truncate">
          {author}
        </div>
      </div>
    </div>
  );
}
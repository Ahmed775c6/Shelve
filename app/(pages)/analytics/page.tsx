'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, Clock, TrendingUp, TrendingDown, 
  Calendar, Target, Award, Zap, 
  BarChart3, Activity,
  FileText, PenTool, Star, Flame,
  Sun, Moon, Sunrise, Sunset, Coffee
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Scatter,
  ScatterChart,
} from 'recharts';

interface BookData {
  _id: string;
  title: string;
  author: string;
  category: string;
  totalPages: number;
  currentPage: number;
  status: 'unread' | 'reading' | 'archived';
  uploadedAt: string;
  startedAt?: string;
  finishedAt?: string;
  rating?: number;
  coverImage?: string;
}

interface WritingData {
  _id: string;
  title: string;
  content: string;
  wordCount: number;
  characterCount: number;
  readTime: number;
  createdAt: string;
  updatedAt: string;
}

interface ReadingSession {
  _id: string;
  bookId: string;
  currentPage: number;
  pagesRead: number;
  lastReadAt: string;
  sessionStart: string;
  sessionDuration?: number; // in minutes
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: number;
}

// Beautiful color palettes
const COLOR_PALETTES = {
  gold: ['#c9a96e', '#d4b47a', '#e0c48a', '#ecd49a', '#f8e4aa'],
  green: ['#4a9e6b', '#5ab07a', '#6ac289', '#7ad398', '#8ae5a7'],
  purple: ['#8b7dd8', '#9b8de8', '#ab9df8', '#bbadff', '#cbbdff'],
  red: ['#e05252', '#e86262', '#f07272', '#f88282', '#ff9292'],
  blue: ['#60a5fa', '#70b5ff', '#80c5ff', '#90d5ff', '#a0e5ff'],
  teal: ['#6ee7b7', '#7ef7c7', '#8effd7', '#9effe7', '#aefff7'],
  orange: ['#f59e0b', '#f5ae1b', '#f5be2b', '#f5ce3b', '#f5de4b'],
  pink: ['#f472b6', '#f482c6', '#f492d6', '#f4a2e6', '#f4b2f6'],
};

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<BookData[]>([]);
  const [writings, setWritings] = useState<WritingData[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Statistics
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalPagesRead: 0,
    totalWritings: 0,
    totalWordsWritten: 0,
    booksCompleted: 0,
    booksReading: 0,
    averageRating: 0,
    readingStreak: 0,
    pagesPerDay: 0,
    mostReadCategory: '',
    longestBook: '',
    shortestBook: '',
    averageSessionDuration: 0,
    totalReadingTime: 0,
    favoriteTimeOfDay: '',
    favoriteDayOfWeek: '',
  });

  // Calendar data
  const [calendarData, setCalendarData] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch books
      const booksRes = await fetch('/api/books');
      const booksData = await booksRes.json();
      setBooks(Array.isArray(booksData) ? booksData : []);

      // Fetch writings
      const writingsRes = await fetch('/api/writings');
      const writingsData = await writingsRes.json();
      setWritings(Array.isArray(writingsData) ? writingsData : []);

      // Fetch reading sessions
      const sessionsRes = await fetch('/api/reading-sessions');
      const sessionsData = await sessionsRes.json();
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);

      calculateStats(booksData, writingsData, sessionsData);

      // Generate calendar data
      generateCalendarData(sessionsData);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-generate calendar data when year or sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      generateCalendarData(sessions);
    }
  }, [selectedYear, sessions]);

  const calculateStats = (booksData: BookData[], writingsData: WritingData[], sessionsData: ReadingSession[]) => {
    const totalBooks = booksData.length;
    const totalWritings = writingsData.length;
    const totalWordsWritten = writingsData.reduce((sum, w) => sum + (w.wordCount || 0), 0);
    const booksCompleted = booksData.filter(b => b.status === 'archived').length;
    const booksReading = booksData.filter(b => b.status === 'reading').length;
    const totalPagesRead = sessionsData.reduce((sum, s) => sum + (s.pagesRead || 0), 0);

    // Calculate average rating
    const ratedBooks = booksData.filter(b => b.rating);
    const averageRating = ratedBooks.length > 0 
      ? Math.round((ratedBooks.reduce((sum, b) => sum + (b.rating || 0), 0) / ratedBooks.length) * 10) / 10
      : 0;

    // Calculate reading streak (consecutive days with reading activity)
    const streak = calculateStreak(sessionsData);

    // Calculate pages per day (last 30 days)
    const pagesPerDay = calculatePagesPerDay(sessionsData);

    // Find most read category
    const categoryCount: Record<string, number> = {};
    booksData.forEach(b => {
      if (b.category) categoryCount[b.category] = (categoryCount[b.category] || 0) + 1;
    });
    const mostReadCategory = Object.entries(categoryCount).length > 0
      ? Object.entries(categoryCount).reduce((prev, curr) => curr[1] > prev[1] ? curr : prev)[0]
      : 'N/A';

    // Find longest and shortest book
    const readBooks = booksData.filter(b => (b.status === 'archived' || (b.currentPage && b.currentPage > 0)) && b.totalPages && b.totalPages > 0);
    let longestBookTitle = 'N/A';
    let shortestBookTitle = 'N/A';
    if (readBooks.length > 0) {
      const longestBook = readBooks.reduce((a, b) => (a.totalPages || 0) > (b.totalPages || 0) ? a : b);
      const shortestBook = readBooks.reduce((a, b) => (a.totalPages || 0) < (b.totalPages || 0) ? a : b);
      longestBookTitle = longestBook.title || 'N/A';
      shortestBookTitle = shortestBook.title || 'N/A';
    }

    // Calculate reading time statistics
    const sessionsWithDuration = sessionsData.filter(s => typeof s.sessionDuration === 'number' && s.sessionDuration > 0);
    const totalReadingTime = sessionsWithDuration.reduce((sum, s) => sum + (s.sessionDuration || 0), 0);
    const averageSessionDuration = sessionsWithDuration.length > 0
      ? Math.round(totalReadingTime / sessionsWithDuration.length)
      : 0;

    // Find favorite time of day
    const timeOfDayCount: Record<string, number> = {};
    sessionsData.forEach(s => {
      if (s.timeOfDay) {
        timeOfDayCount[s.timeOfDay] = (timeOfDayCount[s.timeOfDay] || 0) + 1;
      }
    });
    const favoriteTimeOfDay = Object.entries(timeOfDayCount).length > 0
      ? Object.entries(timeOfDayCount).reduce((prev, curr) => curr[1] > prev[1] ? curr : prev)[0]
      : '';

    // Find favorite day of week
    const dayOfWeekCount: Record<number, number> = {};
    sessionsData.forEach(s => {
      if (typeof s.dayOfWeek === 'number') {
        dayOfWeekCount[s.dayOfWeek] = (dayOfWeekCount[s.dayOfWeek] || 0) + 1;
      }
    });
    const favoriteDayOfWeek = Object.entries(dayOfWeekCount).length > 0
      ? parseInt(Object.entries(dayOfWeekCount).reduce((prev, curr) => curr[1] > prev[1] ? curr : prev)[0], 10)
      : -1;

    setStats({
      totalBooks,
      totalPagesRead,
      totalWritings,
      totalWordsWritten,
      booksCompleted,
      booksReading,
      averageRating,
      readingStreak: streak,
      pagesPerDay,
      mostReadCategory,
      longestBook: longestBookTitle,
      shortestBook: shortestBookTitle,
      averageSessionDuration,
      totalReadingTime,
      favoriteTimeOfDay,
      favoriteDayOfWeek: favoriteDayOfWeek >= 0 ? getDayName(favoriteDayOfWeek) : 'N/A',
    });
  };

  const calculateStreak = (sessions: ReadingSession[]) => {
    if (sessions.length === 0) return 0;

    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);

    // Check each day going backwards
    while (true) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const hasReading = sessions.some(s => {
        const sessionDate = new Date(s.lastReadAt);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      if (hasReading) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const calculatePagesPerDay = (sessions: ReadingSession[]) => {
    if (sessions.length === 0) return 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSessions = sessions.filter(s => 
      new Date(s.lastReadAt) >= thirtyDaysAgo
    );

    const totalPages = recentSessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
    return Math.round(totalPages / 30);
  };

  const getDayName = (dayIndex: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex] || 'Unknown';
  };

  const generateCalendarData = (sessions: ReadingSession[]) => {
    const year = selectedYear;
    const data: any[] = [];
    
    // Create array of all days in the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Count reading sessions for this day
      const daySessions = sessions.filter(s => {
        const sessionDate = new Date(s.lastReadAt);
        return sessionDate.toISOString().split('T')[0] === dateStr;
      });
      
      const pagesRead = daySessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
      const sessionCount = daySessions.length;
      
      data.push({
        date: dateStr,
        count: sessionCount,
        pages: pagesRead,
        day: currentDate.getDay(),
        month: currentDate.getMonth(),
        year: currentDate.getFullYear(),
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setCalendarData(data);
  };

  // Chart Data Preparation
  const getReadingProgressData = () => {
    const booksWithProgress = books.filter(b => b.status === 'reading' || b.status === 'archived');
    return booksWithProgress.map(b => ({
      title: b.title.length > 15 ? b.title.substring(0, 12) + '...' : b.title,
      progress: b.totalPages && b.totalPages > 0 ? Math.round((b.currentPage / b.totalPages) * 100) : 0,
      pages: b.currentPage,
      totalPages: b.totalPages,
      status: b.status,
    })).sort((a, b) => b.progress - a.progress);
  };

  const getCategoryDistribution = () => {
    const distribution: Record<string, number> = {};
    books.forEach(b => {
      distribution[b.category] = (distribution[b.category] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const getReadingActivityData = () => {
    const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365;
    const data = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = sessions.filter(s => {
        const sessionDate = new Date(s.lastReadAt);
        return sessionDate >= date && sessionDate <= dayEnd;
      });

      const pagesRead = daySessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);

      data.push({
        date: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        pages: pagesRead,
        sessions: daySessions.length,
      });
    }

    return data;
  };

  const getWritingActivityData = () => {
    const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365;
    const data = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayWritings = writings.filter(w => {
        const writingDate = new Date(w.createdAt);
        return writingDate >= date && writingDate <= dayEnd;
      });

      const wordsWritten = dayWritings.reduce((sum, w) => sum + (w.wordCount || 0), 0);

      data.push({
        date: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        words: wordsWritten,
        entries: dayWritings.length,
      });
    }

    return data;
  };

  const getReadingVsWritingData = () => {
    const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365;
    const data = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = sessions.filter(s => {
        const sessionDate = new Date(s.lastReadAt);
        return sessionDate >= date && sessionDate <= dayEnd;
      });

      const dayWritings = writings.filter(w => {
        const writingDate = new Date(w.createdAt);
        return writingDate >= date && writingDate <= dayEnd;
      });

      data.push({
        date: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        reading: daySessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0),
        writing: dayWritings.reduce((sum, w) => sum + (w.wordCount || 0), 0),
      });
    }

    return data;
  };

  const getTopBooksByProgress = () => {
    return books
      .filter(b => b.status === 'reading' || b.status === 'archived')
      .map(b => ({
        title: b.title.length > 12 ? b.title.substring(0, 10) + '...' : b.title,
        progress: b.totalPages && b.totalPages > 0 ? Math.round((b.currentPage / b.totalPages) * 100) : 0,
        pages: b.currentPage,
      }))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);
  };

  const getTimeOfDayDistribution = () => {
    const distribution: Record<string, number> = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    };
    
    sessions.forEach(s => {
      if (s.timeOfDay) {
        distribution[s.timeOfDay] = (distribution[s.timeOfDay] || 0) + 1;
      }
    });
    
    return Object.entries(distribution).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  };

  const getDayOfWeekDistribution = () => {
    const distribution: Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };
    
    sessions.forEach(s => {
      if (s.dayOfWeek !== undefined) {
        const dayName = getDayName(s.dayOfWeek);
        distribution[dayName] = (distribution[dayName] || 0) + 1;
      }
    });
    
    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const getSessionDurationData = () => {
    const sessionsWithDuration = sessions.filter(s => s.sessionDuration);
    return sessionsWithDuration.map(s => ({
      date: new Date(s.lastReadAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      duration: s.sessionDuration || 0,
      pages: s.pagesRead || 0,
    }));
  };

  const getReadingEfficiencyData = () => {
    return sessions
      .filter(s => typeof s.sessionDuration === 'number' && s.sessionDuration > 0)
      .map(s => ({
        date: new Date(s.lastReadAt).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        // pages per minute = pages / minutes
        pagesPerMinute: Math.round(((s.pagesRead || 0) / (s.sessionDuration || 1)) * 10) / 10,
        duration: s.sessionDuration || 0,
      }))
      .slice(-20);
  };

  const COLORS = [
    '#c9a96e', '#4a9e6b', '#8b7dd8', '#e05252', 
    '#60a5fa', '#f472b6', '#6ee7b7', '#f59e0b',
    '#a78bfa', '#f87171', '#34d399', '#fbbf24'
  ];

  // Calendar Heatmap Component
  const CalendarHeatmap = ({ data, year }: { data: any[], year: number }) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const getColor = (count: number) => {
      if (count === 0) return 'bg-[#1a1916]';
      if (count === 1) return 'bg-[#4a9e6b]';
      if (count === 2) return 'bg-[#6ac289]';
      if (count >= 3) return 'bg-[#8ae5a7]';
      return 'bg-[#1a1916]';
    };

    const getDayData = (dateStr: string) => {
      return data.find(d => d.date === dateStr) || { count: 0, pages: 0 };
    };

    // Get first day of the year
    const firstDay = new Date(year, 0, 1);
    const startDay = firstDay.getDay(); // 0 = Sunday

    // Generate grid
    const grid = [];
    let currentDate = new Date(year, 0, 1);
    currentDate.setDate(currentDate.getDate() - startDay);

    for (let week = 0; week < 53; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayData = getDayData(dateStr);
        weekDays.push({
          date: dateStr,
          day: currentDate.getDate(),
          month: currentDate.getMonth(),
          year: currentDate.getFullYear(),
          count: dayData.count,
          pages: dayData.pages,
          isCurrentYear: currentDate.getFullYear() === year,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      grid.push(weekDays);
    }

    return (
      <div className="overflow-x-auto">
        <div className="flex gap-4">
          <div className="flex flex-col gap-1 pt-6">
            {days.map((day, i) => (
              <div key={i} className="h-3 text-[9px] text-[#5c5a56] leading-3">
                {i % 2 === 0 ? day[0] : ''}
              </div>
            ))}
          </div>
          <div className="flex-1">
            <div className="flex gap-2 mb-2">
              {months.map((month, i) => (
                <div key={i} className="flex-1 text-[10px] text-[#5c5a56] text-center">
                  {month}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              {grid.map((week, weekIndex) => (
                <div key={weekIndex} className="flex gap-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`w-3 h-3 rounded-sm ${getColor(day.count)} ${
                        day.isCurrentYear ? 'opacity-100' : 'opacity-20'
                      } ${day.count > 0 ? 'hover:scale-150 transition-transform' : ''}`}
                      title={day.isCurrentYear ? `${day.date}: ${day.count} sessions, ${day.pages} pages` : ''}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 text-xs text-[#5c5a56]">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-[#1a1916]"></div>
          <div className="w-3 h-3 rounded-sm bg-[#4a9e6b]"></div>
          <div className="w-3 h-3 rounded-sm bg-[#6ac289]"></div>
          <div className="w-3 h-3 rounded-sm bg-[#8ae5a7]"></div>
          <span>More</span>
        </div>
      </div>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-100">
        <div className="text-[#9b9890]">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#f0ede8] mb-2">Analytics</h1>
        <p className="text-sm text-[#9b9890]">Track your reading and writing habits</p>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-2">
          {['week', 'month', 'year'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-[#c9a96e] text-[#1a1510]'
                  : 'bg-[#1a1916] text-[#9b9890] hover:text-[#f0ede8] hover:bg-[#222119]'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#5c5a56]">Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-sm text-[#f0ede8] focus:border-[#c9a96e] outline-none transition-colors"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-5">
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[#5c5a56] text-[11px] uppercase tracking-wider mb-1">
            <BookOpen size={14} />
            Books
          </div>
          <div className="text-2xl font-serif text-[#f0ede8]">{stats.totalBooks}</div>
          <div className="text-xs text-[#5c5a56] mt-1">
            {stats.booksReading} reading · {stats.booksCompleted} completed
          </div>
        </div>

        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[#5c5a56] text-[11px] uppercase tracking-wider mb-1">
            <FileText size={14} />
            Pages Read
          </div>
          <div className="text-2xl font-serif text-[#c9a96e]">{stats.totalPagesRead.toLocaleString()}</div>
          <div className="text-xs text-[#5c5a56] mt-1">
            {stats.pagesPerDay} pages/day avg
          </div>
        </div>

        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[#5c5a56] text-[11px] uppercase tracking-wider mb-1">
            <PenTool size={14} />
            Writing
          </div>
          <div className="text-2xl font-serif text-[#4a9e6b]">{stats.totalWritings}</div>
          <div className="text-xs text-[#5c5a56] mt-1">
            {stats.totalWordsWritten.toLocaleString()} words written
          </div>
        </div>

        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[#5c5a56] text-[11px] uppercase tracking-wider mb-1">
            <Flame size={14} />
            Streak
          </div>
          <div className="text-2xl font-serif text-[#e05252]">{stats.readingStreak} days</div>
          <div className="text-xs text-[#5c5a56] mt-1">
            Keep it going! 🔥
          </div>
        </div>

        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[#5c5a56] text-[11px] uppercase tracking-wider mb-1">
            <Clock size={14} />
            Reading Time
          </div>
          <div className="text-xl font-serif text-[#f0ede8]">
            {Math.floor(stats.totalReadingTime / 60)}h {stats.totalReadingTime % 60}m
          </div>
          <div className="text-xs text-[#5c5a56] mt-1">
            Avg {stats.averageSessionDuration}m per session
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 xl:grid-cols-5">
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-4">
          <div className="text-[#5c5a56] text-[11px] uppercase tracking-wider mb-1">Average Rating</div>
          <div className="text-xl font-serif text-[#f0ede8]">{stats.averageRating} ⭐</div>
        </div>
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-4">
          <div className="text-[#5c5a56] text-[11px] uppercase tracking-wider mb-1">Most Read</div>
          <div className="text-sm font-medium text-[#f0ede8] truncate">{stats.mostReadCategory || 'N/A'}</div>
        </div>
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-4">
          <div className="text-[#5c5a56] text-[11px] uppercase tracking-wider mb-1">Favorite Time</div>
          <div className="text-sm font-medium text-[#f0ede8] truncate">
            {stats.favoriteTimeOfDay ? (
              <span className="flex items-center gap-1">
                {stats.favoriteTimeOfDay === 'morning' && <Sun size={14} />}
                {stats.favoriteTimeOfDay === 'afternoon' && <Sunrise size={14} />}
                {stats.favoriteTimeOfDay === 'evening' && <Sunset size={14} />}
                {stats.favoriteTimeOfDay === 'night' && <Moon size={14} />}
                {stats.favoriteTimeOfDay.charAt(0).toUpperCase() + stats.favoriteTimeOfDay.slice(1)}
              </span>
            ) : 'N/A'}
          </div>
        </div>
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-4">
          <div className="text-[#5c5a56] text-[11px] uppercase tracking-wider mb-1">Favorite Day</div>
          <div className="text-sm font-medium text-[#f0ede8] truncate">{stats.favoriteDayOfWeek || 'N/A'}</div>
        </div>
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-4">
          <div className="text-[#5c5a56] text-[11px] uppercase tracking-wider mb-1">Longest Book</div>
          <div className="text-sm font-medium text-[#f0ede8] truncate">{stats.longestBook}</div>
        </div>
      </div>

      {/* GitHub-style Calendar */}
      <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[#f0ede8]">
            <Calendar size={16} className="inline mr-2" />
            Reading Calendar
          </h3>
          <div className="text-xs text-[#5c5a56]">
            {calendarData.filter(d => d.count > 0).length} active days in {selectedYear}
          </div>
        </div>
        <CalendarHeatmap data={calendarData} year={selectedYear} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 mb-6 xl:grid-cols-2">
        {/* Reading Progress Chart */}
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[#f0ede8] mb-4">Reading Progress</h3>
          <div className="h-62.5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getReadingProgressData()} layout="vertical">
                <defs>
                  <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b7dd8" />
                    <stop offset="100%" stopColor="#c9a96e" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: '#5c5a56', fontSize: 11 }} />
                <YAxis 
                  type="category" 
                  dataKey="title" 
                  tick={{ fill: '#9b9890', fontSize: 11 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1916',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: '#f0ede8',
                  }}
                  formatter={(value: any) => [`${value}%`, 'Progress']}
                />
                <Bar 
                  dataKey="progress" 
                  fill="url(#progressGradient)"
                  radius={[0, 4, 4, 0]}
                  animationDuration={1500}
                >
                  {getReadingProgressData().map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[#f0ede8] mb-4">Category Distribution</h3>
          <div className="h-62.5">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getCategoryDistribution()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent  } : { name: string, percent: number }) => `${name} ${(percent  * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#5c5a56' }}
                >
                  {getCategoryDistribution().map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke="rgba(255,255,255,0.07)"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1916',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: '#f0ede8',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-xs text-[#9b9890]">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reading Activity */}
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[#f0ede8] mb-4">Reading Activity</h3>
          <div className="h-62.5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getReadingActivityData()}>
                <defs>
                  <linearGradient id="readingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9a96e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#c9a96e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#5c5a56', fontSize: 10 }}
                  interval={selectedPeriod === 'week' ? 0 : selectedPeriod === 'month' ? 3 : 7}
                />
                <YAxis tick={{ fill: '#5c5a56', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1916',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: '#f0ede8',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pages"
                  stroke="#c9a96e"
                  strokeWidth={2}
                  fill="url(#readingGradient)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Writing Activity */}
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[#f0ede8] mb-4">Writing Activity</h3>
          <div className="h-62.5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getWritingActivityData()}>
                <defs>
                  <linearGradient id="writingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4a9e6b" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#4a9e6b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#5c5a56', fontSize: 10 }}
                  interval={selectedPeriod === 'week' ? 0 : selectedPeriod === 'month' ? 3 : 7}
                />
                <YAxis tick={{ fill: '#5c5a56', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1916',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: '#f0ede8',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="words"
                  stroke="#4a9e6b"
                  strokeWidth={2}
                  fill="url(#writingGradient)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reading vs Writing */}
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[#f0ede8] mb-4">Reading vs Writing</h3>
          <div className="h-62.5">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={getReadingVsWritingData()}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#5c5a56', fontSize: 10 }}
                  interval={selectedPeriod === 'week' ? 0 : selectedPeriod === 'month' ? 3 : 7}
                />
                <YAxis tick={{ fill: '#5c5a56', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1916',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: '#f0ede8',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-xs text-[#9b9890]">{value}</span>
                  )}
                />
                <Bar 
                  dataKey="reading" 
                  fill="#c9a96e" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                />
                <Bar 
                  dataKey="writing" 
                  fill="#4a9e6b" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                />
                <Line
                  type="monotone"
                  dataKey="reading"
                  stroke="#8b7dd8"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#8b7dd8', stroke: '#8b7dd8' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time of Day Distribution */}
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[#f0ede8] mb-4">
            <Clock size={14} className="inline mr-2" />
            Reading Time Distribution
          </h3>
          <div className="h-62.5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getTimeOfDayDistribution()}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#9b9890', fontSize: 11 }}
                />
                <YAxis tick={{ fill: '#5c5a56', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1916',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: '#f0ede8',
                  }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                >
                  {getTimeOfDayDistribution().map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Additional Charts - Bottom Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Day of Week Distribution */}
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[#f0ede8] mb-4">
            <Calendar size={14} className="inline mr-2" />
            Day of Week
          </h3>
          <div className="h-50">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getDayOfWeekDistribution()}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#9b9890', fontSize: 10 }}
                  interval={0}
                />
                <YAxis tick={{ fill: '#5c5a56', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1916',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: '#f0ede8',
                  }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                >
                  {getDayOfWeekDistribution().map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Session Duration */}
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[#f0ede8] mb-4">
            <Clock size={14} className="inline mr-2" />
            Session Duration
          </h3>
          <div className="h-50">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getSessionDurationData()}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#5c5a56', fontSize: 9 }}
                  interval={selectedPeriod === 'week' ? 0 : 3}
                />
                <YAxis 
                  tick={{ fill: '#5c5a56', fontSize: 9 }}
                  label={{ value: 'Minutes', angle: -90, fill: '#5c5a56' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1916',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: '#f0ede8',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="duration"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#60a5fa', stroke: '#60a5fa' }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reading Efficiency */}
        <div className="bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[#f0ede8] mb-4">
            <Zap size={14} className="inline mr-2" />
            Reading Efficiency
          </h3>
          <div className="h-50">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis 
                  type="category" 
                  dataKey="date" 
                  tick={{ fill: '#5c5a56', fontSize: 8 }}
                  interval={selectedPeriod === 'week' ? 0 : 3}
                />
                <YAxis 
                  type="number" 
                  dataKey="pagesPerMinute" 
                  tick={{ fill: '#5c5a56', fontSize: 9 }}
                  label={{ value: 'Pages/min', angle: -90, fill: '#5c5a56' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1916',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    color: '#f0ede8',
                  }}
                  formatter={(value: any) => [`${value} pages/min`, 'Speed']}
                />
                <Scatter
                  data={getReadingEfficiencyData()}
                  fill="#f472b6"
                  shape="circle"
                >
                  {getReadingEfficiencyData().map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
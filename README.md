Shelve — Your Personal Library

A modern, full-featured personal library management system with AI-powered recommendations and a rich reading experience.

https://via.placeholder.com/1200x600/0f0e0c/c9a96e?text=Shelve+%E2%80%94+Your+Personal+Library
✨ Features
📚 Library Management

    Book Organization: Categorize books by genre (Fantasy, Sci-fi, Fiction, Non-fiction, Self-help, History, Science, Biography, Philosophy)

    Status Tracking: Mark books as unread, reading, or archived

    Progress Tracking: Monitor reading progress with page counts and percentage completion

    Book Details: View comprehensive book information including category, cover color, file type, and upload date

📖 Reading Experience

    Rich Reader View: Full-screen reading interface with customizable font sizes and themes

    Progress Auto-Save: Automatically saves your reading position

    Reading Statistics: Track pages read, sessions, and estimated time remaining

    Multiple Themes: Choose between Light, Sepia, and Dark reading modes

✍️ Writing & Notes

    Rich Text Editor: Full-featured editor with TipTap (Bold, Italic, Underline, Headings, Lists, Quotes, Code blocks)

    AI Writing Assistant: Generate content, expand ideas, and get creative suggestions

    Writing Statistics: Word count, character count, and estimated reading time

    Personal Notes: Add private or public notes to any book with page references

🤖 AI Features

    Personalized Recommendations: AI-powered book suggestions based on your reading history

    Book Summaries: Get AI-generated summaries of any book

    Interactive Chat: Ask questions about books, themes, and get recommendations

    Writing Assistance: AI-powered writing support for your personal notes and essays

📤 File Management

    Multiple Formats: Support for PDF, ePub, and MOBI files

    Drag & Drop Upload: Easy file upload with preview

    Cloud Storage: Files stored securely via Uploadthing

🔐 Authentication & Security

    Multiple Login Options: Email/password, Google, and GitHub OAuth

    Secure Password Storage: Passwords hashed with bcrypt

    Session Management: JWT-based authentication with NextAuth.js

🎨 Design

    Dark Theme: Elegant dark mode with gold accent colors

    Responsive Layout: Works seamlessly on desktop and mobile

    3D Book Covers: Interactive 3D book display with progress indicators

    Smooth Animations: Subtle transitions and micro-interactions

🚀 Tech Stack
Frontend

    Next.js 14 (App Router)

    React 18 with TypeScript

    Tailwind CSS for styling

    TipTap for rich text editing

    Lucide React for icons

Backend

    Next.js API Routes (RESTful)

    MongoDB with Mongoose ODM

    NextAuth.js for authentication

    Uploadthing for file storage

AI Integration

    Anthropic Claude 3 for AI features

    Custom prompt engineering for book analysis and writing assistance

Deployment

    Vercel ready

    Environment variable management

    Production-optimized builds

📦 Installation
Prerequisites

    Node.js 18+

    MongoDB database

    Anthropic API key

    Uploadthing account

    Google OAuth credentials (optional)

    GitHub OAuth credentials (optional)

Step 1: Clone the repository
bash

git clone https://github.com/yourusername/shelve.git
cd shelve

Step 2: Install dependencies
bash

npm install

Step 3: Set up environment variables

Create a .env.local file in the root directory:
env

# Database
MONGODB_URI=mongodb+srv://your_connection_string

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# AI
ANTHROPIC_API_KEY=sk-ant-...

# File Upload
UPLOADTHING_SECRET=sk_live_...
UPLOADTHING_APP_ID=...

Step 4: Run the development server
bash

npm run dev

Step 5: Open your browser

Navigate to http://localhost:3000
📁 Project Structure
text

shelve/
├── app/
│   ├── api/                    # API routes
│   │   ├── ai/                 # AI endpoints
│   │   ├── auth/               # Authentication
│   │   ├── books/              # Book CRUD
│   │   ├── progress/           # Reading progress
│   │   └── writings/           # Writing CRUD
│   ├── auth/                   # Authentication pages
│   ├── library/                # Library page
│   ├── read/                   # Reading view
│   ├── write/                  # Writing editor
│   ├── upload/                 # Book upload
│   ├── ai/                     # AI recommendations
│   ├── ask/                    # AI chat
│   └── layout.tsx              # Root layout
├── components/
│   ├── book/                   # Book components
│   ├── layout/                 # Layout components
│   ├── reader/                 # Reader components
│   └── ui/                     # UI components
├── lib/                        # Utility functions
├── models/                     # MongoDB models
└── types/                      # TypeScript types

🛠️ API Routes
Books

    GET /api/books - Get all books for user

    POST /api/books - Create a new book

    GET /api/books/[id] - Get specific book

    PATCH /api/books/[id] - Update book

    DELETE /api/books/[id] - Delete book

Progress

    PATCH /api/progress/[bookId] - Update reading progress

    GET /api/progress/[bookId] - Get reading progress

Writings

    GET /api/writings - Get all writings

    POST /api/writings - Create new writing

    PATCH /api/writings/[id] - Update writing

    DELETE /api/writings/[id] - Delete writing

AI

    POST /api/ai/summarize - Generate book summary

    POST /api/ai/recommend - Get book recommendations

    POST /api/ai/chat - AI chat interface

    POST /api/ai/writing-assist - AI writing assistance

Authentication

    POST /api/auth/signup - Register new user

    POST /api/auth/[...nextauth] - NextAuth.js endpoints

🧪 Testing
bash

npm run test

📱 Usage Guide
Adding a Book

    Navigate to the Upload page

    Drag and drop your book file or click to browse

    Fill in book details (title, author, category, pages)

    Select a cover color

    Click "Add to library"

Reading a Book

    Go to your Library or Reading Now page

    Click on any book with "reading" status

    Use the reader toolbar to navigate pages

    Adjust font size and theme in settings

    Your progress is automatically saved

Taking Notes

    Open any book from your library

    Scroll to the Notes section

    Click "Add note" to create a new note

    Optionally associate it with a page number

    Toggle privacy settings (public/private)

Using AI Features

    Recommendations: Visit the AI Recommendations page for personalized book suggestions

    Book Analysis: Use the Ask AI chat to get summaries, theme analysis, and answers

    Writing Assistance: In the Writing editor, click the AI Assist button for creative help

🤝 Contributing

    Fork the repository

    Create a feature branch (git checkout -b feature/amazing-feature)

    Commit your changes (git commit -m 'Add amazing feature')

    Push to the branch (git push origin feature/amazing-feature)

    Open a Pull Request

📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
🙏 Acknowledgments

    Next.js - React framework

    MongoDB - Database

    Tailwind CSS - Styling

    TipTap - Rich text editor

    Anthropic - AI capabilities

    Uploadthing - File storage

    NextAuth.js - Authentication

📧 Contact

Your Name - @yourtwitter - email@example.com

Project Link: https://github.com/yourusername/shelve
🚀 Quick Start for Developers

Want to get started quickly? Run these commands:
bash

# Clone and install
git clone https://github.com/yourusername/shelve.git
cd shelve
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development server
npm run dev

# Build for production
npm run build
npm start

🐛 Known Issues

    PDF Preview: Some PDFs may not render properly in the iframe preview

    Mobile Reader: The reader view is optimized for desktop; mobile improvements are planned

    AI Response Time: AI features may take 2-3 seconds to respond

🔮 Future Enhancements

    Social features (share reading progress, book clubs)

    Advanced search with filters

    Reading challenges and goals

    Book discussion forums
import mongoose, { Schema, Document } from 'mongoose';

export interface IBook extends Document {
  userId: string;
  title: string;
  author: string;
  category: string;
  coverColor: string;
  coverImage?: string;
  fileUrl?: string;
  fileType?: 'pdf' | 'epub' | 'mobi';
  totalPages: number;
  currentPage: number;
  tags: string[];
  status: 'unread' | 'reading' | 'archived';
  uploadedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  rating?: number;
  notes?: string;
}

const BookSchema = new Schema<IBook>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Fantasy', 'Sci-fi', 'Fiction', 'Non-fiction', 'Self-help', 'History', 'Science', 'Biography', 'Philosophy', 'Other'],
    default: 'Other'
  },
  coverColor: { type: String, default: 'c-blue' },
  coverImage: { type: String },
  fileUrl: { type: String },
  fileType: { type: String, enum: ['pdf', 'epub', 'mobi'] },
  totalPages: { type: Number, default: 0 },
  currentPage: { type: Number, default: 0 },
  tags: [String],
  status: { type: String, enum: ['unread', 'reading', 'archived'], default: 'unread' },
  uploadedAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  rating: { type: Number, min: 0, max: 5 },
  notes: { type: String },
}, { timestamps: true });

export default mongoose.models.Book || mongoose.model<IBook>('Book', BookSchema);
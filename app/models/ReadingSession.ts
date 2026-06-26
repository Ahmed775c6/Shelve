import mongoose, { Schema, Document } from 'mongoose';

export interface IReadingSession extends Document {
  userId: string;
  bookId: mongoose.Types.ObjectId;
  currentPage: number;
  lastReadAt: Date;
  sessionStart: Date;
  pagesRead: number;
}

const ReadingSessionSchema = new Schema<IReadingSession>({
  userId: { type: String, required: true, index: true },
  bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  currentPage: { type: Number, default: 0 },
  lastReadAt: { type: Date, default: Date.now },
  sessionStart: { type: Date, default: Date.now },
  pagesRead: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.ReadingSession || mongoose.model<IReadingSession>('ReadingSession', ReadingSessionSchema);
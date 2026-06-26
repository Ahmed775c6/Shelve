import mongoose, { Schema, Document } from 'mongoose';

export interface IBookNote extends Document {
  bookId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  page?: number;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BookNoteSchema = new Schema<IBookNote>({
  bookId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Book', 
    required: true,
    index: true 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  content: { type: String, required: true },
  page: { type: Number },
  isPrivate: { type: Boolean, default: true },
}, { 
  timestamps: true,
});

// Index for efficient queries
BookNoteSchema.index({ bookId: 1, userId: 1 });
BookNoteSchema.index({ bookId: 1, isPrivate: 1 });

export default mongoose.models.BookNote || mongoose.model<IBookNote>('BookNote', BookNoteSchema);
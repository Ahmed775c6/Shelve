import mongoose, { Schema, Document } from 'mongoose';

export interface IWriting extends Document {
  userId: string;
  title: string;
  content: string;
  linkedBookId?: mongoose.Types.ObjectId;
}

const WritingSchema = new Schema<IWriting>({
  userId: { type: String, required: true, index: true },
  title: { type: String, default: 'Untitled' },
  content: { type: String, default: '' },
  linkedBookId: { type: Schema.Types.ObjectId, ref: 'Book' },
}, { timestamps: true });

export default mongoose.models.Writing || mongoose.model<IWriting>('Writing', WritingSchema);
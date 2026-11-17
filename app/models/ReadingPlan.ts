import mongoose, { Schema, Document } from 'mongoose';

export interface IReadingPlan extends Document {
  userId: string;
  title: string;
  bookIds: mongoose.Types.ObjectId[];
  startDate: string;
  endDate: string;
  time: string;
  daysOfWeek: number[];
  reminderEnabled: boolean;
  isActive: boolean;
}

const ReadingPlanSchema = new Schema<IReadingPlan>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  bookIds: [{ type: Schema.Types.ObjectId, ref: 'Book', required: true }],
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  time: { type: String, required: true },
  daysOfWeek: [{ type: Number, min: 0, max: 6, required: true }],
  reminderEnabled: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

ReadingPlanSchema.index({ userId: 1, isActive: 1 });

export default mongoose.models.ReadingPlan ||
  mongoose.model<IReadingPlan>('ReadingPlan', ReadingPlanSchema);

import mongoose from 'mongoose';

const workLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number, // in minutes
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// Compound index to ensure one log per user per day
workLogSchema.index({ userId: 1, date: 1 }, { unique: true });

// Pre-save middleware to calculate duration
workLogSchema.pre('save', function(next) {
  if (this.endTime && this.startTime) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60)); // Convert to minutes
    this.status = 'completed';
  }
  next();
});

export default mongoose.models.WorkLog || mongoose.model('WorkLog', workLogSchema); 
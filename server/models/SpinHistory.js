import mongoose from 'mongoose';

const spinHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  timestamp: {
    type: Number,
    required: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
  },
  roleId: {
    type: String,
    required: true,
  },
  displayValue: {
    type: Number,
    required: true,
  },
  realValue: {
    type: Number,
    required: true,
  },
  scenarioUsed: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('SpinHistory', spinHistorySchema);

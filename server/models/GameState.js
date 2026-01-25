import mongoose from 'mongoose';

const gameStateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  roleInventories: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  riggingConfig: {
    next_spin_mode: {
      type: String,
      enum: ['random', 'force_value', 'troll_fake_high_to_low'],
      default: 'random',
    },
    target_value: Number,
    fake_value: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

gameStateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('GameState', gameStateSchema);

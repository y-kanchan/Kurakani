const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['voice', 'video'],
      required: true,
    },
    status: {
      type: String,
      enum: ['missed', 'answered', 'rejected', 'busy'],
      default: 'missed',
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number, // seconds
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CallLog', callLogSchema);

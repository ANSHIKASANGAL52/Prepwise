const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  pinned: { type: Boolean, default: false },
  userAnswer: { type: String, default: '' },
  feedback: {
    score: { type: Number, min: 0, max: 100 },
    summary: String,
    strengths: [String],
    improvements: [String],
    answerTip: String,
    createdAt: Date,
  },
}, { timestamps: true })

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, required: true, trim: true, maxlength: 100 },
  company: { type: String, trim: true, maxlength: 100, default: 'General practice' },
  experience: { type: String, required: true },
  topics: { type: String, required: true, maxlength: 300 },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  generationMode: { type: String, enum: ['gemini', 'starter'], default: 'gemini' },
  questions: { type: [questionSchema], default: [] },
}, { timestamps: true })

module.exports = mongoose.model('Session', sessionSchema)

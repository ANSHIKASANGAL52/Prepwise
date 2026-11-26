const express = require('express')
const { GoogleGenAI } = require('@google/genai')
const Session = require('../models/Session')
const requireAuth = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

function shapeSession(session) {
  const created = session.toObject ? session.toObject() : session
  const now = Date.now()
  return {
    id: String(created._id), role: created.role, company: created.company || 'General practice',
    experience: created.experience, topics: created.topics, progress: created.progress || 0, generationMode: created.generationMode || 'gemini',
    date: new Date(created.createdAt || now).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    color: 'mint', questions: (created.questions || []).map((question) => ({ id: String(question._id), question: question.question, answer: question.answer, pinned: question.pinned, userAnswer: question.userAnswer || '', feedback: question.feedback || null })),
  }
}

async function generateQuestions({ role, experience, topics }) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured on the API server.')
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const prompt = `Create 10 useful, role-specific interview questions with concise, accurate sample answers. Role: ${role}. Experience: ${experience} years. Focus topics: ${topics}. Return only a JSON array of objects with question and answer string properties.`
  try {
    const result = await ai.models.generateContent({ model: 'gemini-3.5-flash-lite', contents: prompt, config: { responseMimeType: 'application/json' } })
    const text = (result.text || '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed) || !parsed.length) throw new Error('The AI returned an empty question set.')
    return { questions: parsed.slice(0, 10).map((item) => ({ question: String(item.question), answer: String(item.answer) })), generationMode: 'gemini' }
  } catch (error) {
    if (![429, 503].includes(Number(error.status))) throw error
    const concepts = topics.split(',').map((topic) => topic.trim()).filter(Boolean)
    const focus = concepts[0] || role
    const starterQuestions = [
      `Walk me through a project that best shows your strengths as a ${role}.`,
      `How do you explain ${focus} to a teammate who is new to it?`,
      `Tell me about a difficult ${focus} problem you had to solve.`,
      `How do you decide between two possible approaches to a ${role} problem?`,
      `What trade-offs do you consider when building a solution related to ${focus}?`,
      `How do you check the quality and reliability of your work?`,
      `Describe a time you received feedback and changed your approach.`,
      `How would you investigate a bug or unexpected result in your area of work?`,
      `What would you improve in a project you recently worked on, and why?`,
      `What questions would you ask before starting a new ${role} assignment?`,
    ]
    return { generationMode: 'starter', questions: starterQuestions.map((question) => ({ question, answer: `A strong ${role} answer gives a specific example, explains your reasoning, and describes the result. For this question, connect your experience with ${concepts.slice(0, 3).join(', ') || 'the role requirements'}, explain the trade-offs you considered, and finish with what you learned.` })) }
  }
}

router.get('/', async (req, res) => {
  try {
    const items = await Session.find({ user: req.user.id }).sort({ updatedAt: -1 })
    return res.json(items.map(shapeSession))
  } catch (error) { return res.status(500).json({ message: 'Could not load your practice sets.', detail: error.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { role, experience, topics, company } = req.body
    if (!role?.trim() || !topics?.trim()) return res.status(400).json({ message: 'Role and focus topics are required.' })
    if (role.length > 100 || topics.length > 300) return res.status(400).json({ message: 'Please shorten the role or topic description.' })
    const generated = await generateQuestions({ role: role.trim(), experience: Number(experience) || 0, topics: topics.trim() })
    const session = await Session.create({ user: req.user.id, role: role.trim(), experience: `${req.body.level || 'Mid level'} · ${Number(experience) || 0} years`, topics: topics.trim(), company: company?.trim() || 'General practice', questions: generated.questions, generationMode: generated.generationMode })
    return res.status(201).json(shapeSession(session))
  } catch (error) { return res.status(502).json({ message: 'We could not create the AI question set. Check the Gemini key and try again.', detail: error.message }) }
})

router.patch('/:sessionId/questions/:questionId/pin', async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.sessionId, user: req.user.id })
    if (!session) return res.status(404).json({ message: 'Practice set not found.' })
    const question = session.questions.id(req.params.questionId)
    if (!question) return res.status(404).json({ message: 'Question not found.' })
    question.pinned = !question.pinned
    await session.save()
    return res.json({ pinned: question.pinned })
  } catch (error) { return res.status(500).json({ message: 'Could not update that bookmark.', detail: error.message }) }
})

router.post('/:sessionId/questions/:questionId/explain', async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.sessionId, user: req.user.id })
    const question = session?.questions.id(req.params.questionId)
    if (!question) return res.status(404).json({ message: 'Question not found.' })
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ message: 'AI explanations are not configured yet.' })
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const result = await ai.models.generateContent({ model: 'gemini-3.5-flash-lite', contents: `Explain this interview concept in clear, beginner-friendly language with one practical example. Question: ${question.question}` })
    return res.json({ explanation: result.text })
  } catch (error) { return res.status(502).json({ message: 'Could not generate an explanation.', detail: error.message }) }
})

router.post('/:sessionId/questions/:questionId/feedback', async (req, res) => {
  try {
    const userAnswer = String(req.body.answer || '').trim()
    if (!userAnswer) return res.status(400).json({ message: 'Write an answer before requesting feedback.' })
    if (userAnswer.length > 10000) return res.status(400).json({ message: 'Keep your answer under 10,000 characters.' })
    const session = await Session.findOne({ _id: req.params.sessionId, user: req.user.id })
    const question = session?.questions.id(req.params.questionId)
    if (!question) return res.status(404).json({ message: 'Question not found.' })
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ message: 'AI feedback is not configured yet.' })

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const prompt = `You are a supportive technical interview coach. Assess the candidate's answer for the target role: ${session.role}. Interview question: ${question.question}. Candidate answer: ${userAnswer}. Return only valid JSON with this shape: {"score": 0, "summary": "two concise sentences", "strengths": ["specific strength"], "improvements": ["specific actionable improvement"], "answerTip": "one concrete suggestion for a stronger answer"}. Score from 0 to 100. Be constructive and fair; do not invent experience the candidate did not mention.`
    const result = await ai.models.generateContent({ model: 'gemini-3.5-flash-lite', contents: prompt, config: { responseMimeType: 'application/json' } })
    const raw = (result.text || '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(raw)
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)))
    question.userAnswer = userAnswer
    question.feedback = { score, summary: String(parsed.summary || ''), strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 4) : [], improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String).slice(0, 4) : [], answerTip: String(parsed.answerTip || ''), createdAt: new Date() }
    const reviewedCount = session.questions.filter((item) => Boolean(item.feedback?.summary)).length
    session.progress = Math.round((reviewedCount / session.questions.length) * 100)
    await session.save()
    return res.json({ userAnswer: question.userAnswer, feedback: question.feedback, progress: session.progress })
  } catch (error) { return res.status(502).json({ message: 'Could not evaluate that answer. Please try again.', detail: error.message }) }
})

router.delete('/:sessionId', async (req, res) => {
  try {
    const deleted = await Session.findOneAndDelete({ _id: req.params.sessionId, user: req.user.id })
    if (!deleted) return res.status(404).json({ message: 'Practice set not found.' })
    return res.status(204).end()
  } catch (error) { return res.status(500).json({ message: 'Could not delete that practice set.', detail: error.message }) }
})

module.exports = router

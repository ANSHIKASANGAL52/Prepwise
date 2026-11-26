import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, Brain, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Code2, FileText, Flame, LayoutDashboard, Lightbulb, LogOut, Menu, MessageSquareText, Plus, Search, Settings2, Sparkles, Target, Trash2, X } from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
const starterSessions = [
  { id: 'demo-1', role: 'Frontend Engineer', company: 'General practice', experience: 'Mid level · 3 years', topics: 'React, JavaScript, Web performance', date: 'Today', progress: 68, color: 'mint', questions: [
    { id: 'q1', question: 'How does React decide when to re-render a component?', answer: 'A component re-renders when its state changes, its parent renders with new props, or a consumed context value changes. React then compares the new virtual tree with the previous one and commits only the necessary DOM updates. Memoization tools such as memo, useMemo, and useCallback can skip work when their inputs have not changed.', pinned: true },
    { id: 'q2', question: 'What is the difference between a controlled and an uncontrolled input?', answer: 'A controlled input gets its value from React state and reports changes through an event handler. An uncontrolled input keeps its current value in the DOM and can be read with a ref. Controlled inputs make validation and conditional UI easier; uncontrolled inputs can be simpler for small forms.', pinned: false },
    { id: 'q3', question: 'How would you improve the loading performance of a large React application?', answer: 'Start with measurement using browser performance tools and bundle analysis. Then split routes with lazy loading, reduce unused JavaScript, optimize images, cache API responses, and virtualize very long lists. Confirm improvements with repeatable metrics such as LCP and interaction latency.', pinned: false },
  ] },
  { id: 'demo-2', role: 'Product Designer', company: 'General practice', experience: 'Early career · 1 year', topics: 'Design systems, research, accessibility', date: 'Oct 24', progress: 34, color: 'lavender', questions: [
    { id: 'q4', question: 'How do you decide whether a design system component should be flexible or opinionated?', answer: 'Keep the default opinionated around the common case, then expose a small number of meaningful variants. Validate flexibility against real use cases and accessibility. Avoid adding configuration that only solves hypothetical future needs.', pinned: false },
  ] },
  { id: 'demo-3', role: 'Backend Developer', company: 'General practice', experience: 'Mid level · 4 years', topics: 'API design, databases, reliability', date: 'Oct 18', progress: 91, color: 'peach', questions: [
    { id: 'q5', question: 'When would you choose a database transaction?', answer: 'Use a transaction when several database writes must succeed or fail together to preserve an invariant. Keep transactions short, understand the isolation guarantees, and avoid holding them open during network calls.', pinned: true },
  ] },
]

function readSessions() {
  try { const saved = JSON.parse(localStorage.getItem('prepwise-sessions') || 'null'); return Array.isArray(saved) ? saved : starterSessions } catch { return starterSessions }
}
const persist = (items) => localStorage.setItem('prepwise-sessions', JSON.stringify(items))
const initials = (name) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const dayGreeting = () => { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening' }

function App() {
  const [sessions, setSessions] = useState(readSessions)
  const [activeSession, setActiveSession] = useState(null)
  const [activeNav, setActiveNav] = useState('Overview')
  const [showCreate, setShowCreate] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState('signup')
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('prepwise-user')) || { name: 'Avery Chen', email: 'avery@example.com', demo: true } } catch { return { name: 'Avery Chen', email: 'avery@example.com', demo: true } } })
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState(() => localStorage.getItem('prepwise-token') || '')

  useEffect(() => { persist(sessions) }, [sessions])
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 2800); return () => clearTimeout(timer) } }, [toast])
  useEffect(() => { if (token) { Promise.all([fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }), fetch(`${API}/sessions`, { headers: { Authorization: `Bearer ${token}` } })]).then(async ([userResponse, sessionsResponse]) => { if (!userResponse.ok) throw new Error('Session expired'); const profile = await userResponse.json(); setUser(profile); if (sessionsResponse.ok) { const remoteSessions = await sessionsResponse.json(); setSessions(remoteSessions) } }).catch(() => { localStorage.removeItem('prepwise-token'); setToken(''); setUser({ name: 'Avery Chen', email: 'avery@example.com', demo: true }) }) } }, [token])

  const filteredSessions = useMemo(() => sessions.filter((item) => `${item.role} ${item.topics}`.toLowerCase().includes(search.toLowerCase())), [sessions, search])
  const pinnedCount = sessions.reduce((total, item) => total + (item.questions || []).filter((question) => question.pinned).length, 0)
  const allQuestions = sessions.reduce((total, item) => total + (item.questions?.length || 0), 0)

  async function createSession(form) {
    setLoading(true)
    let session
    if (token) {
      try {
        const response = await fetch(`${API}/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not create session')
        session = result
      } catch (error) { setLoading(false); setToast(error.message); return }
    }
    if (!session) session = makeLocalSession(form)
    if (session.generationMode === 'starter' && !session.id.startsWith('local-')) setToast('Gemini is busy right now. We saved a role-specific starter set to your history.')
    setSessions((current) => [session, ...current])
    setActiveSession(session)
    setShowCreate(false)
    setActiveNav('My sessions')
    setLoading(false)
  }

  function makeLocalSession(form) {
    const role = form.role.trim()
    const words = role.toLowerCase().includes('design') ? ['How do you validate a design decision with users?', 'How do you balance accessibility with a visual design goal?', 'What makes a design system component reusable?'] : role.toLowerCase().includes('backend') ? ['How would you design a reliable REST API?', 'When would you use a database transaction?', 'How do you investigate a slow database query?'] : ['How does component state influence rendering?', 'How would you improve the performance of a web application?', 'How do you make an interface accessible to keyboard users?']
    return { id: `local-${crypto.randomUUID()}`, role, company: form.company || 'General practice', experience: `${form.level} · ${form.experience} years`, topics: form.topics, date: 'Just now', progress: 0, generationMode: 'starter', color: 'mint', questions: words.map((question, index) => ({ id: crypto.randomUUID(), question, answer: `A strong answer connects the core concept to a practical example. For ${role}, explain your approach to ${form.topics || 'the problem'}, talk through tradeoffs, and describe how you would measure whether the solution worked.`, pinned: false, number: index + 1 })) }
  }

  async function togglePin(sessionId, questionId) {
    if (token && !sessionId.startsWith('demo-') && !sessionId.startsWith('local-')) {
      try { await fetch(`${API}/sessions/${sessionId}/questions/${questionId}/pin`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }) } catch { /* local state remains usable */ }
    }
    setSessions((current) => current.map((item) => item.id === sessionId ? { ...item, questions: item.questions.map((question) => question.id === questionId ? { ...question, pinned: !question.pinned } : question) } : item))
    if (activeSession?.id === sessionId) setActiveSession((item) => ({ ...item, questions: item.questions.map((question) => question.id === questionId ? { ...question, pinned: !question.pinned } : question) }))
    setToast('Saved to your bookmarks')
  }

  async function evaluateAnswer(sessionId, questionId, answer) {
    if (!token) throw new Error('Sign in to receive live Gemini feedback.')
    if (sessionId.startsWith('demo-') || sessionId.startsWith('local-')) throw new Error('This sample set is stored in your browser. Create a new set while signed in to save an answer and get Gemini feedback.')
    const response = await fetch(`${API}/sessions/${sessionId}/questions/${questionId}/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ answer }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'Could not evaluate your answer.')
    const applyResult = (item) => item?.id === sessionId ? { ...item, progress: result.progress, questions: item.questions.map((question) => question.id === questionId ? { ...question, userAnswer: result.userAnswer, feedback: result.feedback } : question) } : item
    setSessions((current) => current.map(applyResult))
    setActiveSession((current) => applyResult(current))
    return result.feedback
  }

  async function deleteSession(id) { if (token && !id.startsWith('demo-') && !id.startsWith('local-')) { try { await fetch(`${API}/sessions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }) } catch { setToast('Could not reach the server. Removed it from this browser only.') } } setSessions((current) => current.filter((item) => item.id !== id)); setActiveSession(null); setToast('Practice set deleted') }
  function logout() { localStorage.removeItem('prepwise-token'); localStorage.removeItem('prepwise-user'); setToken(''); setUser({ name: 'Avery Chen', email: 'avery@example.com', demo: true }); setToast('Back to demo mode') }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Sparkles size={18} strokeWidth={2.4} /></span><span>prepwise<span className="brand-period">.</span></span><button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list">
        <button className={`nav-link ${activeNav === 'Overview' && !activeSession ? 'nav-active' : ''}`} onClick={() => { setActiveNav('Overview'); setActiveSession(null); setMobileNav(false) }}><LayoutDashboard size={18}/><span>Overview</span></button>
        <button className={`nav-link ${activeNav === 'My sessions' || activeSession ? 'nav-active' : ''}`} onClick={() => { setActiveNav('My sessions'); setActiveSession(null); setMobileNav(false) }}><MessageSquareText size={18}/><span>My sessions</span><span className="nav-count">{sessions.length}</span></button>
        <button className={`nav-link ${activeNav === 'Bookmarks' ? 'nav-active' : ''}`} onClick={() => { setActiveNav('Bookmarks'); setActiveSession(null); setMobileNav(false) }}><Bookmark size={18}/><span>Bookmarks</span><span className="nav-count">{pinnedCount}</span></button>
      </nav>
      <div className="sidebar-spacer" />
      <div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={16}/></div><strong>Make every answer count.</strong><p>Your personal practice space, ready when you are.</p><button onClick={() => setShowCreate(true)}>Start practicing <ArrowRight size={14}/></button><div className="upgrade-orb"/></div>
      <button className="nav-link settings-link" onClick={() => setToast('You are all set — settings are coming soon')}><Settings2 size={18}/><span>Settings</span></button>
      <div className="sidebar-user"><div className="avatar">{initials(user.name)}</div><div className="user-text"><strong>{user.name}</strong><span>{user.demo ? 'Demo workspace' : user.email}</span></div><button className="icon-button logout-button" title="Log out" onClick={logout}><LogOut size={16}/></button></div>
    </aside>

    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu icon-button" aria-label="Open menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Workspace <ChevronRight size={14}/><span>{activeSession ? 'Practice session' : activeNav}</span></div><div className="topbar-right"><span className="today-label"><span className="online-dot"/> Your preparation space</span><button className="top-avatar" onClick={() => setShowAuth(true)} title="Account">{initials(user.name)}</button></div></header>
      {activeSession ? <SessionView session={activeSession} onBack={() => { setActiveSession(null); setActiveNav('My sessions') }} onPin={togglePin} onDelete={() => deleteSession(activeSession.id)} onEvaluate={evaluateAnswer} /> : activeNav === 'Bookmarks' ? <Bookmarks sessions={sessions} onOpen={(session) => setActiveSession(session)} onPin={togglePin} /> : <Dashboard user={user} sessions={activeNav === 'My sessions' ? filteredSessions : sessions.slice(0, 3)} allSessions={sessions} search={search} setSearch={setSearch} onCreate={() => setShowCreate(true)} onOpen={(session) => setActiveSession(session)} onTab={setActiveNav} activeNav={activeNav} questionCount={allQuestions} pinnedCount={pinnedCount} />}
    </main>

    {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={createSession} loading={loading} />}
    {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} onAuth={async (form) => { try { const response = await fetch(`${API}/auth/${authMode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Could not sign in'); localStorage.setItem('prepwise-token', result.token); localStorage.setItem('prepwise-user', JSON.stringify(result.user)); setToken(result.token); setUser(result.user); setShowAuth(false); setToast(`Welcome, ${result.user.name.split(' ')[0]}!`) } catch { setToast('Account service is offline — demo mode is ready to use.'); setShowAuth(false) } }} />}
    {toast && <div className="toast"><span className="toast-check"><Check size={15}/></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={15}/></button></div>}
  </div>
}

function Dashboard({ user, sessions, allSessions, search, setSearch, onCreate, onOpen, onTab, activeNav, questionCount, pinnedCount }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const visibleSessions = activeNav === 'Overview' ? sessions : sessions
  return <div className="page-content">
    <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> {today.toUpperCase()}</div><h1>{dayGreeting()}, {user.name.split(' ')[0]}<span className="wave">✳</span></h1><p className="welcome-copy">A little practice today goes a long way. Ready to get started?</p></div><button className="button button-primary create-top" onClick={onCreate}><Plus size={17}/> New practice set</button></section>
    <section className="hero-banner"><div className="hero-copy"><div className="hero-pill"><Sparkles size={13}/> YOUR NEXT OPPORTUNITY STARTS HERE</div><h2>Show up as your<br/><em>most prepared</em> self.</h2><p>Build confidence one thoughtful answer at a time. Your next great conversation begins with a little practice.</p><button className="button button-light" onClick={onCreate}>Start a practice session <ArrowRight size={16}/></button></div><div className="hero-art" aria-hidden="true"><div className="art-sun"/><div className="art-arch"><div className="arch-inner"/><div className="art-plant plant-one"><i/><i/><i/><b/></div><div className="art-plant plant-two"><i/><i/><b/></div></div><div className="float-card float-card-top"><span className="float-check"><Check size={13}/></span><div><strong>You've got this</strong><small>One question at a time</small></div></div><div className="float-card float-card-bottom"><span className="float-spark"><Sparkles size={15}/></span><div><strong>Practice makes progress</strong><small>Your next session is one click away</small></div></div><div className="art-star star-one">✳</div><div className="art-star star-two">✳</div></div><div className="hero-shape"/></section>
    <section className="stats-grid"><StatCard icon={<Target size={18}/>} label="PRACTICE SETS" value={allSessions.length.toString().padStart(2, '0')} foot="Your interview journeys" tone="green"/><StatCard icon={<FileText size={18}/>} label="QUESTIONS READY" value={questionCount.toString().padStart(2, '0')} foot="Ready for your next review" tone="blue"/><StatCard icon={<Bookmark size={18}/>} label="BOOKMARKED" value={pinnedCount.toString().padStart(2, '0')} foot="Saved to revisit later" tone="orange"/><div className="streak-card"><div className="streak-top"><span>YOUR MOMENTUM</span><Flame size={18}/></div><div className="streak-number">3 <span>day streak</span></div><div className="streak-days">{['M','T','W','T','F','S','S'].map((day, index) => <div key={`${day}-${index}`} className={index < 3 ? 'day-done' : ''}><span>{day}</span><i>{index < 3 ? <Check size={11}/> : ''}</i></div>)}</div></div></section>
    <section className="section-row"><div><div className="section-kicker">KEEP THE MOMENTUM</div><h2 className="section-title">Your practice sets</h2></div><div className="section-actions"><div className="search-box"><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search practice sets" aria-label="Search practice sets"/><kbd>⌘ K</kbd></div><button className="button button-outline" onClick={onCreate}><Plus size={16}/> Create new</button></div></section>
    {visibleSessions.length ? <div className="session-grid">{visibleSessions.map((session) => <SessionCard key={session.id} session={session} onOpen={() => onOpen(session)} />)}{activeNav === 'Overview' && <button className="new-session-card" onClick={onCreate}><span className="new-icon"><Plus size={20}/></span><strong>Start something new</strong><span>Create a practice set tailored to your next opportunity.</span><b>Build your session <ArrowRight size={15}/></b></button>}</div> : <div className="empty-state"><div><Search size={24}/></div><h3>{activeNav === 'My sessions' ? 'No practice sets found' : 'Your next practice set starts here'}</h3><p>Try another search, or create a new session for a role you have in mind.</p><button className="button button-primary" onClick={onCreate}><Plus size={16}/> Create a practice set</button></div>}
    <section className="bottom-note"><div className="note-icon"><Lightbulb size={17}/></div><p><strong>A small tip:</strong> Say your answers out loud. Practicing the explanation is just as valuable as knowing the answer.</p><button onClick={() => onTab('Bookmarks')}>Review bookmarks <ArrowRight size={14}/></button></section>
  </div>
}

function StatCard({ icon, label, value, foot, tone }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div><ArrowUpRight className="stat-arrow" size={15}/></div> }

function SessionCard({ session, onOpen }) {
  const icons = [<Code2 size={18}/>, <Brain size={18}/>, <MessageSquareText size={18}/>]
  return <button className="session-card" onClick={onOpen}><div className="session-card-head"><div className={`session-icon ${session.color || 'mint'}`}>{icons[session.id.length % 3]}</div><span className="session-menu-dot">···</span></div><div className="session-type">{session.company || 'GENERAL PRACTICE'}</div><h3>{session.role}</h3><p className="session-level">{session.experience}</p><div className="topic-list">{(session.topics || '').split(',').slice(0, 3).map((topic) => <span key={topic}>{topic.trim()}</span>)}</div><div className="session-card-footer"><div><div className="progress-label"><span>{session.questions?.length || 0} questions</span><span>{session.progress || 0}%</span></div><div className="progress-track"><i style={{ width: `${session.progress || 0}%` }}/></div></div><div className="session-date"><Clock3 size={13}/>{session.date || 'Recently'}</div></div><span className="card-arrow"><ArrowUpRight size={15}/></span></button>
}

function CreateModal({ onClose, onCreate, loading }) {
  const [form, setForm] = useState({ role: '', experience: '2', level: 'Mid level', topics: '', company: '' })
  const [error, setError] = useState('')
  function submit(event) { event.preventDefault(); if (!form.role.trim() || !form.topics.trim()) { setError('Add a target role and at least one focus topic.'); return } onCreate(form) }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal-card create-modal"><div className="modal-top"><div className="modal-symbol"><Sparkles size={19}/></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19}/></button></div><div className="modal-kicker">A LITTLE PREP GOES A LONG WAY</div><h2>What are you preparing for?</h2><p className="modal-desc">We'll shape a focused practice set around your next opportunity.</p><form onSubmit={submit}><label>Target role <input autoFocus value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="e.g. Product Designer"/></label><div className="form-two"><label>Experience level<select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}><option>Entry level</option><option>Mid level</option><option>Senior</option><option>Lead / Principal</option></select></label><label>Years of experience<input type="number" min="0" max="50" value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })}/></label></div><label>Topics to focus on <input value={form.topics} onChange={(event) => setForm({ ...form, topics: event.target.value })} placeholder="e.g. React, accessibility, system design"/></label><label>Company or interview (optional) <input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="e.g. Acme Inc."/></label>{error && <div className="form-error">{error}</div>}<div className="modal-footer"><span><Sparkles size={14}/> A tailored set of 10 questions</span><button className="button button-primary" disabled={loading}>{loading ? 'Building your set…' : <>Create practice set <ArrowRight size={15}/></>}</button></div></form></section></div>
}

function SessionView({ session, onBack, onPin, onDelete, onEvaluate }) {
  const [openId, setOpenId] = useState(session.questions?.[0]?.id)
  const [explanation, setExplanation] = useState(null)
  const [explaining, setExplaining] = useState(false)
  const [answers, setAnswers] = useState(() => Object.fromEntries((session.questions || []).map((question) => [question.id, question.userAnswer || ''])))
  const [feedbackById, setFeedbackById] = useState(() => Object.fromEntries((session.questions || []).filter((question) => question.feedback).map((question) => [question.id, question.feedback])))
  const [evaluatingId, setEvaluatingId] = useState('')
  const [feedbackError, setFeedbackError] = useState('')
  useEffect(() => {
    setOpenId(session.questions?.[0]?.id)
    setAnswers(Object.fromEntries((session.questions || []).map((question) => [question.id, question.userAnswer || ''])))
    setFeedbackById(Object.fromEntries((session.questions || []).filter((question) => question.feedback).map((question) => [question.id, question.feedback])))
  }, [session.id, session.questions])

  async function explain(question) {
    setExplaining(true)
    setExplanation({ question: question.question, text: 'Start with a clear definition, then connect it to a concrete example from your work. Explain the tradeoffs you considered and how you would know the approach succeeded. A concise answer followed by one thoughtful detail is usually more effective than listing everything you know.' })
    if (session.id && !session.id.startsWith('demo-') && !session.id.startsWith('local-')) {
      try {
        const response = await fetch(`${API}/sessions/${session.id}/questions/${question.id}/explain`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('prepwise-token') || ''}` } })
        const data = await response.json()
        if (response.ok) setExplanation({ question: question.question, text: data.explanation })
      } catch { /* keep the starter explanation visible */ }
    }
    setExplaining(false)
  }

  async function submitAnswer(event, question) {
    event.preventDefault()
    const answer = (answers[question.id] || '').trim()
    if (!answer) { setFeedbackError('Write a few sentences first, then request feedback.'); return }
    setFeedbackError('')
    setEvaluatingId(question.id)
    try {
      const feedback = await onEvaluate(session.id, question.id, answer)
      setFeedbackById((current) => ({ ...current, [question.id]: feedback }))
    } catch (error) { setFeedbackError(error.message) }
    finally { setEvaluatingId('') }
  }

  return <div className="page-content session-page">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16}/> Back to practice sets</button>
    <div className="detail-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> PRACTICE SESSION</div><h1>{session.role}</h1><p>{session.experience} <span>·</span> {session.topics}</p>{session.generationMode === 'starter' && <div className="starter-notice">{session.id.startsWith('local-') ? 'Sample questions are saved in this browser.' : 'Gemini is busy. Starter questions are saved to your history.'}</div>}</div><div className="detail-actions"><button className="button button-outline" onClick={onDelete}><Trash2 size={15}/> Delete set</button></div></div>
    <div className="session-overview-strip"><div className="overview-item"><span className="overview-icon"><CircleHelp size={17}/></span><div><small>QUESTIONS</small><strong>{session.questions?.length || 0} to practice</strong></div></div><div className="overview-item"><span className="overview-icon"><Clock3 size={17}/></span><div><small>ESTIMATED TIME</small><strong>~{Math.max(5, (session.questions?.length || 0) * 3)} minutes</strong></div></div><div className="overview-item"><span className="overview-icon"><Target size={17}/></span><div><small>YOUR FOCUS</small><strong>{session.role}</strong></div></div><div className="overview-progress"><div><span>Session progress</span><strong>{session.progress || 0}%</strong></div><div className="progress-track"><i style={{ width: `${session.progress || 0}%` }}/></div></div></div>
    <div className="question-layout"><div><div className="question-heading"><div><div className="section-kicker">TAKE IT ONE QUESTION AT A TIME</div><h2 className="section-title">Practice questions</h2></div><span className="question-count">{session.questions?.length || 0} questions</span></div>
      <div className="question-list">{(session.questions || []).map((question, index) => {
        const feedback = feedbackById[question.id] || question.feedback
        return <article key={question.id} className={`question-card ${openId === question.id ? 'question-open' : ''}`}>
          <button className="question-trigger" onClick={() => { setOpenId(openId === question.id ? null : question.id); setFeedbackError('') }}><span className="question-number">{String(index + 1).padStart(2, '0')}</span><strong>{question.question}</strong><span className="question-toggle">{openId === question.id ? <X size={16}/> : <Plus size={17}/>}</span></button>
          {openId === question.id && <div className="answer-content"><div className="answer-label"><span className="answer-dot"/> YOUR TURN</div><p className="answer-prompt">Write the answer you would give in an interview. Your coach will review it for clarity, relevance, and supporting detail.</p>
            <form className="candidate-answer-form" onSubmit={(event) => submitAnswer(event, question)}><textarea value={answers[question.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} maxLength={10000} placeholder="Type your answer here…" aria-label="Your interview answer"/><div className="candidate-answer-footer"><span>{(answers[question.id] || '').length} / 10,000 characters</span><button className="button button-primary" disabled={evaluatingId === question.id}>{evaluatingId === question.id ? <><span className="mini-loader"/> Reviewing…</> : <><Sparkles size={14}/> Get AI feedback</>}</button></div>{feedbackError && <p className="feedback-error">{feedbackError}</p>}</form>
            {feedback && <section className="feedback-card"><div className="feedback-top"><div><div className="answer-label"><span className="answer-dot"/> YOUR AI FEEDBACK</div><p>{feedback.summary}</p></div><div className="score-badge"><strong>{feedback.score}</strong><span>/ 100</span></div></div><div className="feedback-columns"><div><strong className="feedback-heading">What worked</strong><ul>{(feedback.strengths || []).map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul></div><div><strong className="feedback-heading">Try improving</strong><ul>{(feedback.improvements || []).map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul></div></div>{feedback.answerTip && <div className="answer-tip"><Lightbulb size={14}/><span><strong>Next time:</strong> {feedback.answerTip}</span></div>}</section>}
            <div className="answer-actions"><button className={`text-action ${question.pinned ? 'text-action-active' : ''}`} onClick={() => onPin(session.id, question.id)}><Bookmark size={14} fill={question.pinned ? 'currentColor' : 'none'}/>{question.pinned ? 'Bookmarked' : 'Save for later'}</button><button className="text-action" onClick={() => explain(question)}><Sparkles size={14}/> Explain this concept</button><details className="sample-answer"><summary>View sample answer</summary><p>{question.answer}</p></details></div>
          </div>}
        </article>
      })}</div></div>
      <aside className="coach-card"><div className="coach-icon"><Lightbulb size={18}/></div><div className="section-kicker">A NOTE FROM YOUR COACH</div><h3>It's okay to pause and think.</h3><p>A thoughtful answer is better than a fast one. Take a breath, then talk through how you approach the problem.</p><div className="coach-divider"/><div className="coach-stat"><span><Activity size={15}/> Your focus topics</span><strong>{session.topics}</strong></div></aside></div>
    {explanation && <div className="explanation-panel"><button className="explanation-close icon-button" onClick={() => setExplanation(null)} aria-label="Close"><X size={17}/></button><div className="explanation-label"><Sparkles size={14}/> CONCEPT BREAKDOWN {explaining && <span className="mini-loader"/>}</div><h3>{explanation.question}</h3><p>{explanation.text}</p></div>}
  </div>
}
function Bookmarks({ sessions, onOpen, onPin }) {
  const saved = sessions.flatMap((session) => (session.questions || []).filter((question) => question.pinned).map((question) => ({ ...question, session })))
  return <div className="page-content"><div className="eyebrow"><span className="eyebrow-line"/> YOUR PERSONAL REVIEW LIST</div><h1 className="page-title">Bookmarks</h1><p className="welcome-copy bookmarks-copy">The questions you want to come back to, all in one place.</p>{saved.length ? <div className="bookmark-list">{saved.map(({ session, ...question }) => <article className="bookmark-card" key={question.id}><button className="bookmark-open" onClick={() => onOpen(session)}><div className="bookmark-card-label"><Bookmark size={13} fill="currentColor"/> {session.role} <span>·</span> {session.experience}</div><h3>{question.question}</h3><p>{question.answer}</p><span className="bookmark-view">Open practice set <ArrowRight size={14}/></span></button><button className="bookmark-remove icon-button" title="Remove bookmark" onClick={() => onPin(session.id, question.id)}><X size={17}/></button></article>)}</div> : <div className="empty-state"><div><Bookmark size={24}/></div><h3>No bookmarks yet</h3><p>Save a question during practice and it will show up here for quick review.</p><button className="button button-primary" onClick={() => onOpen(sessions[0])}>Browse practice sets <ArrowRight size={15}/></button></div>}</div>
}

function AuthModal({ mode, setMode, onClose, onAuth }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal-card auth-modal"><div className="modal-top"><div className="modal-symbol"><Sparkles size={19}/></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19}/></button></div><div className="modal-kicker">WELCOME TO PREPWISE</div><h2>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2><p className="modal-desc">Save your sessions and keep your preparation in one place.</p><form onSubmit={(event) => { event.preventDefault(); onAuth(form) }}>{mode === 'signup' && <label>Your name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Jordan Lee"/></label>}<label>Email address<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com"/></label><label>Password<input required type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters"/></label><button className="button button-primary auth-submit">{mode === 'signup' ? 'Create my account' : 'Sign in'} <ArrowRight size={15}/></button></form><div className="auth-switch">{mode === 'signup' ? 'Already have an account?' : 'New to Prepwise?'} <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></div><div className="auth-demo"><Sparkles size={14}/> You can keep exploring in demo mode without signing in.</div></section></div>
}

export default App

import React, { useState, useEffect } from 'react';
import { 
  Search, Star, GitFork, BookOpen, Bot, Sparkles, 
  Send, RefreshCw, AlertCircle, Award 
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const BACKEND_URL = "http://127.0.0.1:8000";
const COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb923c', '#4ade80'];

function generateHeatmap() {
  const days = [];
  for (let i = 0; i < 112; i++) {
    days.push(Math.floor(Math.random() * 5));
  }
  return days;
}

export default function App() {
  const [username, setUsername] = useState('torvalds');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Vibe Check State
  const [jdText, setJdText] = useState('');
  const [vibeResult, setVibeResult] = useState(null);
  const [vibeLoading, setVibeLoading] = useState(false);

  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [pitch, setPitch] = useState('');

  const heatmap = React.useMemo(() => generateHeatmap(), [username]);

  const fetchProfile = async (targetUser = username, refresh = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/profile/${targetUser}?refresh=${refresh}`);
      if (!res.ok) throw new Error('User not found or GitHub rate limited');
      const json = await res.json();
      setData(json);
      setVibeResult(null);
      setPitch('');
      setChatMessages([
        { sender: 'bot', text: `Hi! I am the portfolio assistant for ${json.profile.name || targetUser}. Ask me anything about their projects or stack!` }
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile('torvalds');
  }, []);

  const handleVibeCheck = async () => {
    if (!jdText.trim()) return;
    setVibeLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/vibe-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.profile.username, job_description: jdText })
      });
      const result = await res.json();
      setVibeResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setVibeLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    const userText = inputMsg;
    setInputMsg('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.profile.username, question: userText })
      });
      const resData = await res.json();
      setChatMessages(prev => [...prev, { sender: 'bot', text: resData.answer }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Error querying portfolio assistant.' }]);
    }
  };

  const generatePitch = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/pitch/${data.profile.username}`);
      const json = await res.json();
      setPitch(json.pitch);
    } catch (err) {
      console.error(err);
    }
  };

  const langChartData = data?.profile?.top_languages
    ? Object.entries(data.profile.top_languages).map(([name, value]) => ({ name, value }))
    : [];

  const getHeatmapColor = (lvl) => {
    switch (lvl) {
      case 1: return '#064e3b';
      case 2: return '#047857';
      case 3: return '#10b981';
      case 4: return '#34d399';
      default: return '#1f2937';
    }
  };

  return (
    <div className="container">
      {/* Header Bar */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#4f46e5', padding: '10px', borderRadius: '10px' }}>
            <BookOpen size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>GitHub Developer Portfolio</h1>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Visualized activity & SQLite-cached analytics</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="input-field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProfile(username)}
            placeholder="Search GitHub username..."
            style={{ width: '220px' }}
          />
          <button 
            className="btn-primary" 
            onClick={() => fetchProfile(username, true)}
            title="Refresh Cache"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: '#991b1b', background: '#450a0a', color: '#fca5a5', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <>
          {/* Vibe Check Result Badge */}
          {vibeResult && (
            <div className="card" style={{ background: 'linear-gradient(135deg, #1e1b4b, #0f172a)', borderColor: '#6366f1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <Award size={36} color="#818cf8" />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', textTransform: 'uppercase', color: '#a5b4fc', fontWeight: 'bold' }}>Tech Stack Compatibility Score</span>
                    <span className="badge" style={{ background: '#4f46e5', color: '#fff' }}>
                      {vibeResult.match_percentage}% Match
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', marginTop: '6px' }}>
                    Matched Skills: <strong style={{ color: '#34d399' }}>{vibeResult.matched_skills.join(', ') || 'None found'}</strong>
                  </p>
                  {vibeResult.missing_skills.length > 0 && (
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      Missing: {vibeResult.missing_skills.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Profile & Top Languages */}
          <div className="grid-3">
            {/* Profile Header */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img 
                  src={data.profile.avatar_url} 
                  alt={data.profile.username} 
                  style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #6366f1' }}
                />
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{data.profile.name || data.profile.username}</h2>
                  <p style={{ fontSize: '13px', color: '#818cf8' }}>@{data.profile.username}</p>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '14px 0' }}>
                {data.profile.bio || 'No public bio available.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#1f2937', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Total Stars</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>
                    <Star size={16} fill="#fbbf24" /> {data.profile.total_stars}
                  </div>
                </div>
                <div style={{ background: '#1f2937', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Followers</span>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#38bdf8' }}>{data.profile.followers}</p>
                </div>
              </div>
            </div>

            {/* Top Languages Pie Chart */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', width: '100%', marginBottom: '8px' }}>Top Languages</h3>
              <div style={{ width: '100%', height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={langChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      innerRadius={38}
                    >
                      {langChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* The Vibe Check Input */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Sparkles size={18} color="#818cf8" />
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>The Vibe Check</h3>
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
                  Paste a Job Description to verify stack compatibility.
                </p>
                <textarea
                  className="input-field"
                  rows="3"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste Job Description here (e.g. Needs Python, C, Docker, SQL)..."
                  style={{ resize: 'none', fontSize: '12px' }}
                />
              </div>
              <button 
                className="btn-primary" 
                onClick={handleVibeCheck}
                disabled={vibeLoading || !jdText}
                style={{ marginTop: '10px' }}
              >
                {vibeLoading ? 'Calculating...' : 'Compute Match %'}
              </button>
            </div>
          </div>

          {/* Activity Heatmap Grid */}
          <div className="card">
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Coding Streak Heatmap</h3>
            <div style={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, 14px)', gap: '4px', overflowX: 'auto', paddingBottom: '6px' }}>
              {heatmap.map((lvl, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    width: '14px', 
                    height: '14px', 
                    borderRadius: '2px', 
                    background: getHeatmapColor(lvl) 
                  }} 
                  title={`Activity intensity: Level ${lvl}`}
                />
              ))}
            </div>
          </div>

          {/* Repositories Cards Grid */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '14px' }}>
              Repositories ({data.repos.length})
            </h3>
            <div className="grid-3">
              {data.repos.map((repo) => (
                <div key={repo.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <a href={repo.html_url} target="_blank" rel="noreferrer" style={{ color: '#818cf8', fontWeight: 'bold', textDecoration: 'none', fontSize: '15px' }}>
                      {repo.name}
                    </a>
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', lineHeight: '1.4' }}>
                      {repo.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '10px', borderTop: '1px solid #1f2937', fontSize: '12px', color: '#94a3b8' }}>
                    <span className="badge" style={{ background: '#1f2937', color: '#cbd5e1' }}>{repo.language}</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Star size={14} color="#fbbf24" /> {repo.stars}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><GitFork size={14} /> {repo.forks}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Recruiter Elevator Pitch Generator */}
      {data && (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#818cf8" /> AI Recruiter Elevator Pitch
            </h4>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              {pitch || "Need a quick pitch for hiring managers? Click generate."}
            </p>
          </div>
          <button className="btn-primary" onClick={generatePitch}>
            {pitch ? "Regenerate Pitch" : "Generate Pitch"}
          </button>
        </div>
      )}

      {/* Embedded Chatbot Drawer */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100 }}>
        {!chatOpen ? (
          <button 
            className="btn-primary" 
            onClick={() => setChatOpen(true)}
            style={{ borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
          >
            <Bot size={18} />
            <span>Ask Candidate Bot</span>
          </button>
        ) : (
          <div className="card" style={{ width: '320px', padding: '0', overflow: 'hidden', boxShadow: '0 20px 30px rgba(0,0,0,0.6)' }}>
            <div style={{ background: '#1f2937', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bot size={16} color="#818cf8" /> Portfolio Chatbot
              </span>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ height: '240px', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {chatMessages.map((m, idx) => (
                <div key={idx} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', background: m.sender === 'user' ? '#4f46e5' : '#1f2937', color: '#fff', padding: '8px 12px', borderRadius: '10px', fontSize: '12px' }}>
                  {m.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: '8px', borderTop: '1px solid #1f2937' }}>
              <input
                className="input-field"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Ask about candidate's stack..."
                style={{ fontSize: '12px' }}
              />
              <button type="submit" className="btn-primary" style={{ marginLeft: '6px', padding: '8px 12px' }}>
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
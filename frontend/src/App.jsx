import { useState, useEffect } from 'react';

const API = '';  // empty = uses proxy to localhost:8000

const CATEGORIES = ['OPEN','OBC','SC','ST','EWS','NT1','NT2','NT3','VJ','SEBC','TFWS'];
const GENDERS    = ['General', 'Ladies'];
const CAP_ROUNDS = [{ value: 3, label: 'CAP Round 3 (recommended)' }, { value: 1, label: 'CAP Round 1' }];

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    background: '#f7f6f3',
    padding: '24px 16px 60px',
  },
  container: {
    maxWidth: 720,
    margin: '0 auto',
  },

  // Header
  header: {
    marginBottom: 36,
    paddingBottom: 24,
    borderBottom: '1.5px solid #e0ded8',
  },
  logo: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 28,
    color: '#1a1a1a',
    letterSpacing: '-0.5px',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7a7a72',
    fontWeight: 400,
  },

  // Form card
  card: {
    background: '#fff',
    borderRadius: 16,
    border: '1.5px solid #e8e6e0',
    padding: '28px 24px',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#7a7a72',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 20,
  },

  // Form grid
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },
  grid1: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 14,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: '#5a5a52',
    letterSpacing: '0.02em',
  },
  input: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1.5px solid #e0ded8',
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a1a',
    background: '#fafaf8',
    outline: 'none',
    transition: 'border-color 0.15s',
    width: '100%',
  },
  select: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1.5px solid #e0ded8',
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a1a',
    background: '#fafaf8',
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237a7a72' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight: 36,
  },

  // Search button
  btn: {
    width: '100%',
    padding: '14px',
    borderRadius: 12,
    border: 'none',
    background: '#1a1a1a',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    marginTop: 8,
    transition: 'opacity 0.15s, transform 0.1s',
    letterSpacing: '0.01em',
  },

  // Section headers
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a1a',
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 20,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },

  // College cards
  collegeCard: {
    background: '#fff',
    borderRadius: 14,
    border: '1.5px solid #e8e6e0',
    padding: '16px 18px',
    marginBottom: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  collegeName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1a1a1a',
    lineHeight: 1.4,
    marginBottom: 4,
  },
  collegeMeta: {
    fontSize: 12,
    color: '#9a9a90',
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaChip: {
    background: '#f0efe9',
    padding: '2px 8px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    color: '#5a5a52',
  },
  percentileBlock: {
    textAlign: 'right',
    flexShrink: 0,
  },
  percentileValue: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1a1a1a',
    letterSpacing: '-0.5px',
  },
  percentileLabel: {
    fontSize: 10,
    color: '#9a9a90',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  diffChip: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 6,
    marginTop: 4,
    display: 'inline-block',
  },

  // States
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#9a9a90',
    fontSize: 14,
  },
  error: {
    background: '#fff3f3',
    border: '1.5px solid #ffcdd2',
    borderRadius: 12,
    padding: '14px 18px',
    fontSize: 14,
    color: '#c62828',
    marginTop: 16,
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 0',
    color: '#9a9a90',
    fontSize: 14,
  },
  disclaimer: {
    fontSize: 12,
    color: '#9a9a90',
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 1.6,
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function CollegeCard({ college, isTop5 }) {
  const diff = college.difference;
  const diffColor = Math.abs(diff) <= 1 ? '#2e7d32' : Math.abs(diff) <= 3 ? '#e65100' : '#5a5a52';
  const diffBg   = Math.abs(diff) <= 1 ? '#e8f5e9' : Math.abs(diff) <= 3 ? '#fff3e0' : '#f0efe9';
  const diffText = diff > 0 ? `+${diff.toFixed(1)} above you` : diff < 0 ? `${Math.abs(diff).toFixed(1)} below you` : 'exact match';


  return (
    <div style={s.collegeCard}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.collegeName}>{college.college_name}</div>
        <div style={s.collegeMeta}>
          <span style={s.metaChip}>{college.branch_name}</span>
          <span style={s.metaChip}>{college.category}</span>
          {college.gender_quota !== 'General' && (
            <span style={s.metaChip}>{college.gender_quota}</span>
          )}
        </div>
      </div>
      <div style={s.percentileBlock}>
        <div style={s.percentileValue}>{college.closing_percentile.toFixed(1)}</div>
        <div style={s.percentileLabel}>%ile cutoff</div>
        {!isTop5 && (
          <div style={{ ...s.diffChip, color: diffColor, background: diffBg }}>
            {diffText}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, count, badgeColor, badgeBg, badgeText }) {
  return (
    <div style={s.sectionHeader}>
      <span style={s.sectionTitle}>{title}</span>
      <span style={{ ...s.sectionBadge, color: badgeColor, background: badgeBg }}>
        {badgeText || count}
      </span>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [branches, setBranches]     = useState([]);
  const [form, setForm]             = useState({
    percentile: '',
    category:   'OPEN',
    branch:     '',
    gender:     'General',
    cap_round:  3,
    window:     5,
  });
  const [results, setResults]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [btnHover, setBtnHover]     = useState(false);

  // Load branches on mount
  useEffect(() => {
    fetch(`${API}/branches`)
      .then(r => r.json())
      .then(d => {
        setBranches(d.branches || []);
        if (d.branches?.length) setForm(f => ({ ...f, branch: d.branches[0] }));
      })
      .catch(() => {});
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSearch = async () => {
    if (!form.percentile || !form.branch) {
      setError('Please enter your percentile and select a branch.');
      return;
    }
    const pct = parseFloat(form.percentile);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setError('Percentile must be between 0 and 100.');
      return;
    }
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(`${API}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, percentile: pct }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setResults(data);
    } catch (e) {
      setError('Could not fetch results. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.logo}>MHT CET Finder</div>
          <div style={s.subtitle}>Find colleges based on your 2024 CAP round cutoffs</div>
        </div>

        {/* Form */}
        <div style={s.card}>
          <div style={s.cardTitle}>Your Details</div>

          <div style={{ ...s.grid2, marginBottom: 14 }}>
            <div style={s.fieldGroup}>
              <label style={s.label}>MHT CET Percentile</label>
              <input
                style={s.input}
                type="number"
                min="0" max="100" step="0.01"
                placeholder="e.g. 85.50"
                value={form.percentile}
                onChange={e => set('percentile', e.target.value)}
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Category</label>
              <select style={s.select} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ ...s.grid1, marginBottom: 14 }}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Branch</label>
              <select style={s.select} value={form.branch} onChange={e => set('branch', e.target.value)}>
                {branches.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div style={{ ...s.grid2, marginBottom: 20 }}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Gender Quota</label>
              <select style={s.select} value={form.gender} onChange={e => set('gender', e.target.value)}>
                {GENDERS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>CAP Round</label>
              <select style={s.select} value={form.cap_round} onChange={e => set('cap_round', parseInt(e.target.value))}>
                {CAP_ROUNDS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button
            style={{ ...s.btn, opacity: btnHover ? 0.85 : 1 }}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Find My Colleges →'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={s.loadingRow}>
            <span>Searching 307 colleges...</span>
          </div>
        )}

        {/* Results */}
        {results && (
          <>
            {/* Top 5 */}
            <SectionHeader
              title="Aspirational Colleges"
              badgeColor="#1565c0"
              badgeBg="#e3f2fd"
              badgeText="Top picks"
            />
            {results.top5.length === 0 ? (
              <div style={s.emptyState}>No data available for this branch in top colleges.</div>
            ) : (
              results.top5.map((c, i) => <CollegeCard key={i} college={c} isTop5 />)
            )}

            {/* Personalized */}
            <SectionHeader
              title="Your Best Matches"
              count={results.personalized.length}
              badgeColor="#2e7d32"
              badgeBg="#e8f5e9"
              badgeText={`${results.personalized.length} colleges`}
            />
            <div style={{ fontSize: 12, color: '#9a9a90', marginBottom: 14, marginTop: -6 }}>
              Colleges where last year's closing percentile was within ±5 of yours ({results.percentile}%ile)
            </div>
            {results.personalized.length === 0 ? (
              <div style={s.emptyState}>
                No colleges found in the ±5 range for your inputs.<br />
                Try widening your search or changing the CAP round.
              </div>
            ) : (
              results.personalized.map((c, i) => <CollegeCard key={i} college={c} isTop5={false} />)
            )}

            <div style={s.disclaimer}>
              Based on 2024 CAP Round data · Cutoffs may vary ±5–10 points each year<br />
              Always verify on the official DTE Maharashtra website
            </div>
          </>
        )}

      </div>
    </div>
  );
}
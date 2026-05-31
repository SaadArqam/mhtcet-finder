import { useState, useEffect, useRef } from 'react';

const API = '';

const CATEGORIES = ['OPEN','OBC','SC','ST','EWS','NT1','NT2','NT3','VJ','SEBC','TFWS'];
const GENDERS    = ['General', 'Ladies'];
const CAP_ROUNDS = [{ value: 3, label: 'CAP Round 3 (recommended)' }, { value: 1, label: 'CAP Round 1' }];
const SEAT_TYPES = [
  { label: 'All Seats', value: 'all' },
  { label: 'State Level Only', value: 'State' },
  { label: 'Other Than Home University', value: 'Other' },
];
const MAX_BRANCHES = 5;
const MAX_CITIES   = 3;
const MAX_COMPARE  = 3;

const PRINT_CSS = `
@media print {
  body { background: #fff !important; margin: 0; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .print-header { margin-bottom: 20px; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; }
  .print-header h1 { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
  .print-header p  { font-size: 12px; color: #555; margin: 2px 0; }
  .college-card-print { border: 1px solid #ccc; border-radius: 8px; padding: 12px 16px;
    margin-bottom: 8px; display: flex; justify-content: space-between; page-break-inside: avoid; }
  .section-title-print { font-size: 15px; font-weight: 700; margin: 18px 0 8px;
    border-left: 3px solid #1a1a1a; padding-left: 10px; }
  .print-section-break { page-break-before: always; }
  .college-card { box-shadow: none !important; width: 100% !important; }
}
@media screen { .print-only { display: none !important; } }
`;

const s = {
  page: { minHeight: '100vh', background: '#f7f6f3', padding: '24px 16px 120px', position: 'relative' },
  container: { maxWidth: 720, margin: '0 auto' },

  header: { marginBottom: 36, paddingBottom: 24, borderBottom: '1.5px solid #e0ded8' },
  logo: { fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#1a1a1a', letterSpacing: '-0.5px', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#7a7a72', fontWeight: 400 },

  card: { background: '#fff', borderRadius: 16, border: '1.5px solid #e8e6e0', padding: '28px 24px', marginBottom: 20 },
  cardTitle: { fontSize: 13, fontWeight: 600, color: '#7a7a72', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 500, color: '#5a5a52', letterSpacing: '0.02em', display: 'flex', justifyContent: 'space-between' },
  input: {
    padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e0ded8',
    fontSize: 15, fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a',
    background: '#fafaf8', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  select: {
    padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e0ded8',
    fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a',
    background: '#fafaf8', outline: 'none', width: '100%', cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237a7a72' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36,
  },

  checkboxLabel: {
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#1a1a1a',
    fontWeight: 500, cursor: 'pointer', marginTop: 22,
  },
  checkbox: { width: 18, height: 18, cursor: 'pointer' },

  btn: {
    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
    background: '#1a1a1a', color: '#fff', fontSize: 15, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', marginTop: 8,
    transition: 'opacity 0.15s', letterSpacing: '0.01em',
  },

  multiBox: {
    border: '1.5px solid #e0ded8', borderRadius: 10, background: '#fafaf8',
    minHeight: 44, cursor: 'text', position: 'relative',
  },
  multiSearch: {
    border: 'none', outline: 'none', background: 'transparent',
    fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#1a1a1a',
    padding: '8px 10px', width: '100%', boxSizing: 'border-box',
  },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: '#1a1a1a', color: '#fff', borderRadius: 6,
    padding: '3px 8px 3px 10px', fontSize: 12, fontWeight: 500,
    margin: '4px 4px 0',
  },
  chipRemove: {
    cursor: 'pointer', fontSize: 14, lineHeight: 1, opacity: 0.7,
    background: 'none', border: 'none', color: '#fff', padding: 0,
  },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
    background: '#fff', border: '1.5px solid #e0ded8', borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)', maxHeight: 220, overflowY: 'auto',
    marginTop: 4,
  },
  dropdownItem: {
    padding: '10px 14px', fontSize: 14, cursor: 'pointer', color: '#1a1a1a',
  },

  resultsHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 24, marginBottom: 4, gap: 12, flexWrap: 'wrap',
  },
  resultsTitle: { fontSize: 18, fontWeight: 600, color: '#1a1a1a' },

  sectionHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#1a1a1a' },
  sectionBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' },

  collegeCard: {
    background: '#fff', borderRadius: 14, border: '1.5px solid #e8e6e0',
    padding: '16px 18px', marginBottom: 10,
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
  },
  collegeName: { fontSize: 14, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.4, marginBottom: 8 },
  collegeMeta: { fontSize: 12, color: '#9a9a90', display: 'flex', gap: 8, flexWrap: 'wrap' },
  metaChip: { background: '#f0efe9', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, color: '#5a5a52' },

  percentileBlock: { textAlign: 'right', flexShrink: 0 },
  percentileValue: { fontSize: 18, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.5px' },
  percentileLabel: { fontSize: 10, color: '#9a9a90', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' },
  diffChip: { fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6, marginTop: 4, display: 'inline-block' },

  emptyState: { textAlign: 'center', padding: '40px 20px', color: '#9a9a90', fontSize: 14 },
  error: { background: '#fff3f3', border: '1.5px solid #ffcdd2', borderRadius: 12, padding: '14px 18px', fontSize: 14, color: '#c62828', marginTop: 16 },
  loadingRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: '#9a9a90', fontSize: 14 },
  disclaimer: { fontSize: 12, color: '#9a9a90', textAlign: 'center', marginTop: 40, lineHeight: 1.6 },

  pdfBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e0ded8',
    background: '#fff', color: '#1a1a1a', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
  },
};

if (!document.getElementById('__mhtcet_print_css')) {
  const style = document.createElement('style');
  style.id = '__mhtcet_print_css';
  style.textContent = PRINT_CSS;
  document.head.appendChild(style);
}

function TagChip({ label, color, bg }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
      background: bg, color, marginRight: 4, marginTop: 4,
      display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {label}
    </span>
  );
}

function naacColors(grade) {
  if (grade === 'A++' || grade === 'A+') return { color: '#1b5e20', bg: '#e8f5e9' };
  if (grade === 'A') return { color: '#33691e', bg: '#f1f8e9' };
  return { color: '#616161', bg: '#f5f5f5' };
}

function MultiSelect({ options, selected, onToggle, placeholder, max, label }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(
    o => !selected.includes(o) && o.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={s.fieldGroup}>
      <label style={s.label}>
        <span>{label}</span>
        <span style={{ color: '#9a9a90', fontWeight: 400 }}>({selected.length}/{max})</span>
      </label>
      <div ref={ref} style={{ position: 'relative' }}>
        <div style={s.multiBox} onClick={() => setOpen(true)}>
          <div style={{ display: 'flex', flexWrap: 'wrap', padding: '4px 6px 6px' }}>
            {selected.map(item => (
              <span key={item} style={s.chip}>
                {item}
                <button style={s.chipRemove} onClick={e => { e.stopPropagation(); onToggle(item); }}>×</button>
              </span>
            ))}
            <input
              style={{ ...s.multiSearch, flex: 1, minWidth: 100 }}
              value={query}
              placeholder={selected.length === 0 ? placeholder : ''}
              onChange={e => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
            />
          </div>
        </div>
        {open && (
          <div style={s.dropdown}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 13, color: '#9a9a90' }}>
                {options.length === 0 ? 'Loading…' : query ? 'No matches' : 'All selected'}
              </div>
            ) : (
              filtered.map(item => (
                <div
                  key={item}
                  style={s.dropdownItem}
                  onMouseDown={e => {
                    e.preventDefault();
                    if (selected.length < max) { onToggle(item); setQuery(''); }
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f7f6f3'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                >
                  {item}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CollegeCard({ college, isTop5 }) {
  const diff = college.difference;
  const diffColor = Math.abs(diff) <= 1 ? '#2e7d32' : Math.abs(diff) <= 3 ? '#e65100' : '#5a5a52';
  const diffBg    = Math.abs(diff) <= 1 ? '#e8f5e9'  : Math.abs(diff) <= 3 ? '#fff3e0' : '#f0efe9';
  const diffText  = diff > 0 ? `+${diff.toFixed(1)} above you` : diff < 0 ? `${Math.abs(diff).toFixed(1)} below you` : 'exact match';

  const tags = [];
  if (college.college_type === 'Government') tags.push({ label: 'Government', color: '#1565c0', bg: '#e3f2fd' });
  else if (college.college_type === 'Aided') tags.push({ label: 'Aided', color: '#00695c', bg: '#e0f2f1' });
  else if (college.college_type === 'Deemed') tags.push({ label: 'Deemed', color: '#6a1b9a', bg: '#f3e5f5' });
  if (college.is_autonomous) tags.push({ label: 'Autonomous', color: '#4a148c', bg: '#ede7f6' });
  if (college.naac_grade) {
    const nc = naacColors(college.naac_grade);
    tags.push({ label: `NAAC ${college.naac_grade}`, ...nc });
  }
  if (college.is_nba) tags.push({ label: 'NBA', color: '#006064', bg: '#e0f7fa' });
  if (college.is_girls_only) tags.push({ label: 'Girls Only', color: '#880e4f', bg: '#fce4ec' });
  if (college.is_minority) tags.push({ label: 'Minority', color: '#e65100', bg: '#fff3e0' });

  return (
    <div style={s.collegeCard} className="college-card">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.collegeName}>{college.college_name}</div>
        <div style={s.collegeMeta}>
          <span style={s.metaChip}>{college.branch_name}</span>
          <span style={s.metaChip}>{college.category}</span>
          {college.city && <span style={s.metaChip}>{college.city}</span>}
          {college.gender_quota !== 'General' && <span style={s.metaChip}>{college.gender_quota}</span>}
        </div>
        {tags.length > 0 && (
          <div>
            {tags.map((t, i) => <TagChip key={i} label={t.label} color={t.color} bg={t.bg} />)}
          </div>
        )}
      </div>
      <div style={s.percentileBlock}>
        <div style={s.percentileValue}>{college.closing_percentile.toFixed(1)}</div>
        <div style={s.percentileLabel}>%ile cutoff</div>
        {!isTop5 && (
          <div style={{ ...s.diffChip, color: diffColor, background: diffBg }}>{diffText}</div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, badgeColor, badgeBg, badgeText }) {
  return (
    <div style={s.sectionHeader}>
      <span style={s.sectionTitle}>{title}</span>
      <span style={{ ...s.sectionBadge, color: badgeColor, background: badgeBg }}>{badgeText}</span>
    </div>
  );
}

export default function App() {
  const [branchOptions, setBranchOptions] = useState([]);
  const [cityOptions, setCityOptions]     = useState([]);

  const [form, setForm] = useState({
    percentile: '', category: 'OPEN', gender: 'General', cap_round: 3, window: 5,
    branches: [], cities: [], seat_type: 'all', minority_only: false,
  });

  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [btnHover, setBtnHover] = useState(false);
  const [pdfHover, setPdfHover] = useState(false);

  useEffect(() => {
    fetch(`${API}/branches`).then(r => r.json()).then(d => setBranchOptions(d.branches || [])).catch(() => {});
    fetch(`${API}/cities`).then(r => r.json()).then(d => setCityOptions(d.cities || [])).catch(() => {});
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleBranch = (b) => setForm(f => ({
    ...f,
    branches: f.branches.includes(b)
      ? f.branches.filter(x => x !== b)
      : f.branches.length < MAX_BRANCHES ? [...f.branches, b] : f.branches,
  }));

  const toggleCity = (c) => setForm(f => ({
    ...f,
    cities: f.cities.includes(c)
      ? f.cities.filter(x => x !== c)
      : f.cities.length < MAX_CITIES ? [...f.cities, c] : f.cities,
  }));

  const handleSearch = async () => {
    if (!form.percentile || form.branches.length === 0) {
      setError('Please enter your percentile and select at least one branch.');
      return;
    }
    const pct = parseFloat(form.percentile);
    if (isNaN(pct) || pct < 0 || pct > 100) { setError('Percentile must be between 0 and 100.'); return; }
    setError('');
    setLoading(true);
    setResults(null);

    try {
      const res = await fetch(`${API}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentile: pct,
          category: form.category,
          branch: form.branches,
          cities: form.cities,
          gender: form.gender,
          cap_round: form.cap_round,
          window: form.window,
          seat_type: form.seat_type,
          minority_only: form.minority_only,
        }),
      });
      if (!res.ok) throw new Error('API error');
      setResults(await res.json());
    } catch {
      setError('Could not fetch results. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const seatLabel = SEAT_TYPES.find(st => st.value === form.seat_type)?.label || form.seat_type;

  const PrintSummary = () => (
    <div className="print-only">
      <div className="print-header">
        <h1>MHT CET College Finder</h1>
        <p>
          <strong>Percentile:</strong> {form.percentile} &nbsp;|&nbsp;
          <strong>Category:</strong> {form.category} &nbsp;|&nbsp;
          <strong>Gender:</strong> {form.gender} &nbsp;|&nbsp;
          <strong>CAP Round:</strong> {form.cap_round} &nbsp;|&nbsp;
          <strong>Seat Type:</strong> {seatLabel}
          {form.minority_only && <span> &nbsp;|&nbsp; <strong>Minority Only</strong></span>}
        </p>
        <p><strong>Branches:</strong> {form.branches.join(', ')}</p>
        {form.cities.length > 0 && <p><strong>Cities:</strong> {form.cities.join(', ')}</p>}
      </div>

      <div className="section-title-print">Aspirational Colleges</div>
      {results?.top5.map((c, i) => (
        <div key={i} className="college-card-print">
          <div>
            <strong style={{ fontSize: 13 }}>{c.college_name}</strong>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
              {c.branch_name} · {c.category}{c.city ? ` · ${c.city}` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong>{c.closing_percentile.toFixed(1)}</strong>
            <div style={{ fontSize: 10, color: '#888' }}>%ile cutoff</div>
          </div>
        </div>
      ))}

      <div className="section-title-print print-section-break">Your Best Matches</div>
      {results?.personalized.map((c, i) => (
        <div key={i} className="college-card-print">
          <div>
            <strong style={{ fontSize: 13 }}>{c.college_name}</strong>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
              {c.branch_name} · {c.category}{c.city ? ` · ${c.city}` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong>{c.closing_percentile.toFixed(1)}</strong>
            <div style={{ fontSize: 10, color: '#888' }}>%ile cutoff</div>
          </div>
        </div>
      ))}
      <p style={{ fontSize: 10, color: '#999', marginTop: 24 }}>
        Based on 2024 CAP Round data · Always verify on the official DTE Maharashtra website
      </p>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.container}>
        <PrintSummary />

        <div style={s.header} className="no-print">
          <div style={s.logo}>MHT CET Finder</div>
          <div style={s.subtitle} className="no-print">Find colleges based on your 2024 CAP round cutoffs</div>
        </div>

        <div style={s.card} className="no-print">
          <div style={s.cardTitle}>Your Details</div>

          <div style={{ ...s.grid2, marginBottom: 14 }}>
            <div style={s.fieldGroup}>
              <label style={s.label}>MHT CET Percentile</label>
              <input
                style={s.input} type="number" min="0" max="100" step="0.01"
                placeholder="e.g. 85.50" value={form.percentile}
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

          <div style={{ marginBottom: 14 }}>
            <MultiSelect
              options={branchOptions}
              selected={form.branches}
              onToggle={toggleBranch}
              placeholder="Search branches…"
              max={MAX_BRANCHES}
              label="Preferred Branches"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <MultiSelect
              options={cityOptions}
              selected={form.cities}
              onToggle={toggleCity}
              placeholder="Filter by city (optional)…"
              max={MAX_CITIES}
              label="Preferred Cities"
            />
          </div>

          <div style={{ ...s.grid2, marginBottom: 14 }}>
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

          <div style={{ ...s.grid2, marginBottom: 20 }}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Seat Type</label>
              <select style={s.select} value={form.seat_type} onChange={e => set('seat_type', e.target.value)}>
                {SEAT_TYPES.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
              </select>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.checkboxLabel}>
                <input
                  type="checkbox"
                  style={s.checkbox}
                  checked={form.minority_only}
                  onChange={e => set('minority_only', e.target.checked)}
                />
                Minority Quota Only
              </label>
            </div>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button
            style={{ ...s.btn, opacity: btnHover ? 0.85 : 1 }}
            className="no-print"
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? 'Searching…' : 'Find My Colleges →'}
          </button>
        </div>

        {loading && (
          <div style={s.loadingRow} className="no-print">Searching colleges…</div>
        )}

        {results && (
          <>
            <div style={s.resultsHeader} className="no-print">
              <div style={s.resultsTitle}>Your Results</div>
              <button
                style={{ ...s.pdfBtn, background: pdfHover ? '#f7f6f3' : '#fff' }}
                className="no-print"
                onMouseEnter={() => setPdfHover(true)}
                onMouseLeave={() => setPdfHover(false)}
                onClick={() => window.print()}
              >
                Download PDF
              </button>
            </div>

            <SectionHeader title="Aspirational Colleges" badgeColor="#1565c0" badgeBg="#e3f2fd" badgeText="Top picks" />
            <div className="no-print">
              {results.top5.length === 0
                ? <div style={s.emptyState}>No data for this branch in top colleges.</div>
                : results.top5.map((c, i) => <CollegeCard key={i} college={c} isTop5 />)
              }
            </div>

            <SectionHeader
              title="Your Best Matches"
              badgeColor="#2e7d32" badgeBg="#e8f5e9"
              badgeText={`${results.personalized.length} college${results.personalized.length !== 1 ? 's' : ''}`}
            />
            <div style={{ fontSize: 12, color: '#9a9a90', marginBottom: 14, marginTop: -6 }} className="no-print">
              Within ±{form.window} percentile of your score ({results.percentile}%ile)
            </div>
            <div className="no-print">
              {results.personalized.length === 0
                ? <div style={s.emptyState}>No colleges found. Try widening your search or removing filters.</div>
                : results.personalized.map((c, i) => <CollegeCard key={i} college={c} isTop5={false} />)
              }
            </div>

            <div style={s.disclaimer} className="no-print">
              Based on 2024 CAP Round data · Cutoffs may vary ±5–10 points each year<br />
              Always verify on the official DTE Maharashtra website
            </div>
          </>
        )}
      </div>
    </div>
  );
}

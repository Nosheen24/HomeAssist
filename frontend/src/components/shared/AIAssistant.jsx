import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecommendation } from '../../api/ai';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import StarRating from '../ui/StarRating';

const urgencyConfig = {
  emergency: { variant: 'red',    label: 'Emergency' },
  high:      { variant: 'orange', label: 'High Priority' },
  medium:    { variant: 'yellow', label: 'Medium Priority' },
  low:       { variant: 'green',  label: 'Low Priority' },
};

export default function AIAssistant() {
  const navigate = useNavigate();
  const [problem, setProblem] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!problem.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await getRecommendation(problem.trim(), location.trim() || undefined);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-ha-surface border border-ha-border rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-[4px] bg-ha-primary flex items-center justify-center flex-shrink-0">
          <svg className="h-5 w-5 text-ha-text-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-ha-text-1">AI Service Advisor</h2>
          <p className="text-sm text-ha-text-3">Describe your problem and get instant recommendations</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="e.g. My kitchen tap is leaking and water is dripping constantly..."
          rows={3}
          className="w-full rounded-[6px] border border-ha-border bg-ha-bg px-4 py-3 text-sm text-ha-text-1 placeholder-ha-text-3 focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary resize-none"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City (optional)"
            className="flex-1 rounded-[6px] border border-ha-border bg-ha-bg px-4 py-2.5 text-sm text-ha-text-1 placeholder-ha-text-3 focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary"
          />
          <Button type="submit" loading={loading} disabled={!problem.trim()}>
            {loading ? 'Analyzing...' : 'Find Help'}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-ha-danger/10 border border-ha-danger/40 rounded-[6px] text-sm text-ha-danger">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {urgencyConfig[result.urgency] && (
              <Badge variant={urgencyConfig[result.urgency].variant}>
                {urgencyConfig[result.urgency].label}
              </Badge>
            )}
            {result.categories?.map((cat) => (
              <Badge key={cat} variant="teal">{cat.replace('-', ' ')}</Badge>
            ))}
          </div>

          <p className="text-sm text-ha-text-2 bg-ha-surface-2 rounded-[6px] p-3 border border-ha-border">
            {result.explanation}
          </p>

          {result.providers?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ha-text-1 mb-2">Recommended Providers</h3>
              <div className="space-y-2">
                {result.providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/providers/${p.id}`)}
                    className="w-full text-left bg-ha-surface-2 rounded-[6px] border border-ha-border px-4 py-3 hover:border-ha-primary transition-all flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-ha-text-1">{p.user?.name}</p>
                      <p className="text-xs text-ha-text-3">{p.user?.location}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <StarRating rating={p.avgRating} size="sm" />
                      <span className="text-xs text-ha-text-2 font-mono">{Number(p.avgRating).toFixed(1)}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => navigate(`/search?category=${result.categories?.[0] || ''}`)}
                className="mt-3 text-sm text-ha-primary hover:text-ha-primary-hover font-medium"
              >
                See all providers →
              </button>
            </div>
          )}

          {result.providers?.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-ha-text-2 mb-2">No providers found for your location.</p>
              <Button variant="secondary" size="sm" onClick={() => navigate('/search')}>
                Browse all providers
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

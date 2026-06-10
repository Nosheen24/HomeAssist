import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecommendation } from '../../api/ai';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import StarRating from '../ui/StarRating';

const urgencyConfig = {
  emergency: { variant: 'red', label: 'Emergency' },
  high: { variant: 'orange', label: 'High Priority' },
  medium: { variant: 'yellow', label: 'Medium Priority' },
  low: { variant: 'green', label: 'Low Priority' },
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
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">AI Service Advisor</h2>
          <p className="text-sm text-gray-600">Describe your problem and get instant recommendations</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="e.g. My kitchen tap is leaking and water is dripping constantly..."
          rows={3}
          className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City (optional)"
            className="flex-1 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <Button type="submit" loading={loading} disabled={!problem.trim()}>
            {loading ? 'Analyzing...' : 'Find Help'}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
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
              <Badge key={cat} variant="indigo">{cat.replace('-', ' ')}</Badge>
            ))}
          </div>

          <p className="text-sm text-gray-700 bg-white rounded-xl p-3 border border-indigo-100">
            {result.explanation}
          </p>

          {result.providers?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Recommended Providers</h3>
              <div className="space-y-2">
                {result.providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/providers/${p.id}`)}
                    className="w-full text-left bg-white rounded-xl border border-indigo-100 px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.user?.name}</p>
                      <p className="text-xs text-gray-500">{p.user?.location}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <StarRating rating={p.avgRating} size="sm" />
                      <span className="text-xs text-gray-600">{Number(p.avgRating).toFixed(1)}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => navigate(`/search?category=${result.categories?.[0] || ''}`)}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                See all providers →
              </button>
            </div>
          )}

          {result.providers?.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-2">No providers found for your location.</p>
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

import { Link } from 'react-router-dom';
import StarRating from '../ui/StarRating';
import Badge from '../ui/Badge';

function Avatar({ name, size = 'md' }) {
  const sizes = { sm: 'h-10 w-10 text-sm', md: 'h-12 w-12 text-base', lg: 'h-16 w-16 text-xl' };
  const colors = ['bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function ProviderCard({ provider }) {
  const { id, avgRating, reviewCount, isVerified, user, services } = provider;

  return (
    <Link
      to={`/providers/${id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all duration-200 group"
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar name={user?.name} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
              {user?.name}
            </h3>
            {isVerified && (
              <svg className="h-4 w-4 text-indigo-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <svg className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs text-gray-500 truncate">{user?.location}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <StarRating rating={avgRating} size="sm" />
        <span className="text-xs text-gray-600 font-medium">{Number(avgRating).toFixed(1)}</span>
        <span className="text-xs text-gray-400">({reviewCount} reviews)</span>
      </div>

      {services?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {services.slice(0, 3).map((svc) => (
            <span key={svc.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-600">
              {svc.category?.name}
              <span className="font-medium text-gray-800">
                PKR {Number(svc.price).toLocaleString()}
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        {isVerified ? (
          <Badge variant="green">Verified</Badge>
        ) : (
          <Badge variant="default">Unverified</Badge>
        )}
        <span className="text-xs font-medium text-indigo-600 group-hover:text-indigo-700">
          View Profile →
        </span>
      </div>
    </Link>
  );
}

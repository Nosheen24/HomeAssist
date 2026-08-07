import { useState } from 'react';
import { Link } from 'react-router-dom';
import StarRating from '../ui/StarRating';

const AVATAR_PALETTES = [
  'bg-green-100 text-ha-primary',
  'bg-amber-100 text-amber-600',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-600',
];

function Avatar({ name, photo }) {
  const color = AVATAR_PALETTES[(name?.charCodeAt(0) || 0) % AVATAR_PALETTES.length];
  if (photo) {
    return (
      <img
        src={photo}
        alt={name || 'Provider'}
        className="h-12 w-12 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className={`h-12 w-12 ${color} rounded-full flex items-center justify-center font-semibold text-base flex-shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function ProviderCard({ provider }) {
  const { id, avgRating, reviewCount, isVerified, user, services, profilePhoto } = provider;
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/providers/${id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="block relative bg-ha-surface rounded-xl overflow-hidden group transition-all duration-200"
      style={{
        border: `1px solid ${hovered ? '#16A34A' : '#E8DDD5'}`,
        boxShadow: hovered
          ? '0 8px 24px -4px rgba(22,163,74,0.15), 0 2px 8px -2px rgba(26,17,10,0.06)'
          : '0 1px 4px 0 rgba(26,17,10,0.07)',
      }}
    >
      <div className="relative p-5">
        <div className="flex items-start gap-3 mb-3">
          <Avatar name={user?.name} photo={profilePhoto} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-semibold text-ha-text-1 group-hover:text-ha-primary transition-colors truncate">
                {user?.name}
              </h3>
              {isVerified && (
                <svg className="h-4 w-4 text-ha-teal flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <svg className="h-3.5 w-3.5 text-ha-text-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs text-ha-text-3 truncate">{user?.location}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <StarRating rating={avgRating} size="sm" />
          <span className="text-xs text-ha-text-2 font-medium font-mono">{Number(avgRating).toFixed(1)}</span>
          <span className="text-xs text-ha-text-3">({reviewCount})</span>
        </div>

        {services?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {services.slice(0, 3).map((svc) => (
              <span
                key={svc.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-ha-surface-2 border border-ha-border rounded-full text-xs text-ha-text-2"
              >
                {svc.category?.name}
                <span className="font-medium text-ha-primary font-mono">
                  {Number(svc.price).toLocaleString()}
                </span>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          {isVerified ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-ha-teal border border-teal-200">
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ha-surface-2 text-ha-text-3">
              Unverified
            </span>
          )}
          <span className="text-xs font-semibold border border-ha-primary text-ha-primary px-3 py-1 rounded-[4px] group-hover:bg-ha-primary group-hover:text-white transition-colors">
            View Profile →
          </span>
        </div>
      </div>
    </Link>
  );
}

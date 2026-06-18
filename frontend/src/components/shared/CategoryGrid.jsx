import { Link } from 'react-router-dom';

const CATEGORY_META = {
  plumbing:           { emoji: '🔧', accent: 'text-ha-primary bg-ha-primary/10' },
  electrical:         { emoji: '⚡', accent: 'text-ha-accent bg-ha-accent/10' },
  cleaning:           { emoji: '🧹', accent: 'text-ha-teal bg-ha-teal/10' },
  carpentry:          { emoji: '🔨', accent: 'text-ha-primary bg-ha-primary/10' },
  'ac-repair':        { emoji: '❄️', accent: 'text-ha-teal bg-ha-teal/10' },
  painting:           { emoji: '🎨', accent: 'text-ha-accent bg-ha-accent/10' },
  'appliance-repair': { emoji: '🔌', accent: 'text-ha-text-2 bg-ha-surface-2' },
  gardening:          { emoji: '🌿', accent: 'text-ha-teal bg-ha-teal/10' },
};

export default function CategoryGrid({ categories = [], compact = false }) {
  if (!categories.length) {
    return (
      <div className={`grid ${compact ? 'grid-cols-4 gap-3' : 'grid-cols-2 sm:grid-cols-4 gap-4'}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-ha-surface rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${compact ? 'grid-cols-4 gap-3' : 'grid-cols-2 sm:grid-cols-4 gap-4'}`}>
      {categories.map((cat) => {
        const meta = CATEGORY_META[cat.slug] || { emoji: '🏠', accent: 'text-ha-text-2 bg-ha-surface-2' };
        return (
          <Link
            key={cat.id}
            to={`/search?category=${cat.slug}`}
            className="relative group flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-ha-surface border border-ha-border hover:border-ha-primary transition-all duration-200 text-center overflow-hidden"
          >
            <div className="absolute inset-0 halftone opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none" />
            <div className={`relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${meta.accent}`}>
              {meta.emoji}
            </div>
            <span className={`relative z-10 font-medium leading-tight group-hover:text-ha-text-1 transition-colors ${compact ? 'text-xs' : 'text-sm'} text-ha-text-2`}>
              {cat.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

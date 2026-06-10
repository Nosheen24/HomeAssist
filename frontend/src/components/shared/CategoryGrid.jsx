import { Link } from 'react-router-dom';

const CATEGORY_META = {
  plumbing: { icon: '🔧', color: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100' },
  electrical: { icon: '⚡', color: 'bg-yellow-50 text-yellow-700 border-yellow-100 hover:bg-yellow-100' },
  cleaning: { icon: '🧹', color: 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100' },
  carpentry: { icon: '🔨', color: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' },
  'ac-repair': { icon: '❄️', color: 'bg-cyan-50 text-cyan-700 border-cyan-100 hover:bg-cyan-100' },
  painting: { icon: '🎨', color: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100' },
  'appliance-repair': { icon: '🔌', color: 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100' },
  gardening: { icon: '🌿', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' },
};

export default function CategoryGrid({ categories = [], compact = false }) {
  if (!categories.length) {
    return (
      <div className={`grid ${compact ? 'grid-cols-4 gap-3' : 'grid-cols-2 sm:grid-cols-4 gap-4'}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${compact ? 'grid-cols-4 gap-3' : 'grid-cols-2 sm:grid-cols-4 gap-4'}`}>
      {categories.map((cat) => {
        const meta = CATEGORY_META[cat.slug] || { icon: '🏠', color: 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100' };
        return (
          <Link
            key={cat.id}
            to={`/search?category=${cat.slug}`}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-200 text-center group ${meta.color}`}
          >
            <span className={compact ? 'text-2xl' : 'text-3xl'}>{meta.icon}</span>
            <span className={`font-medium leading-tight ${compact ? 'text-xs' : 'text-sm'}`}>{cat.name}</span>
          </Link>
        );
      })}
    </div>
  );
}

export const categoryGradients = {
  Development: 'from-primary-500 to-primary-700',
  'Data & AI': 'from-violet-500 to-violet-600',
  Design: 'from-rose-400 to-rose-600',
  Marketing: 'from-accent-400 to-accent-600',
  Infrastructure: 'from-sky-400 to-sky-600',
  Security: 'from-emerald-400 to-emerald-600',
}

export const categoryBadgeColors = {
  Development: 'bg-primary-500/20 text-primary-300',
  'Data & AI': 'bg-violet-500/20 text-violet-300',
  Design: 'bg-rose-500/20 text-rose-300',
  Marketing: 'bg-accent-500/20 text-accent-300',
  Infrastructure: 'bg-sky-500/20 text-sky-300',
  Security: 'bg-emerald-500/20 text-emerald-300',
}

export const categoryBadgeColorsLight = {
  Development: 'bg-primary-100 text-primary-700',
  'Data & AI': 'bg-violet-100 text-violet-600',
  Design: 'bg-rose-100 text-rose-600',
  Marketing: 'bg-accent-100 text-accent-700',
  Infrastructure: 'bg-sky-100 text-sky-600',
  Security: 'bg-emerald-100 text-emerald-700',
}

export function formatPrice(price) {
  return price.toLocaleString('en-IN')
}

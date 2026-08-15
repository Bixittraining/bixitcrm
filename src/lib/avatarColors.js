// Shared avatar-gradient lookup — was duplicated verbatim inside
// Students.jsx; StudentDetail.jsx needs the exact same mapping so a
// student's avatar color never changes between the list and their profile.
const AVATAR_GRADIENTS = {
  A: 'from-rose-500 to-pink-600', B: 'from-orange-500 to-amber-600', C: 'from-amber-500 to-yellow-600',
  D: 'from-emerald-500 to-green-600', E: 'from-teal-500 to-emerald-600', F: 'from-cyan-500 to-teal-600',
  G: 'from-sky-500 to-cyan-600', H: 'from-blue-500 to-sky-600', I: 'from-indigo-500 to-blue-600',
  J: 'from-violet-500 to-indigo-600', K: 'from-purple-500 to-violet-600', L: 'from-fuchsia-500 to-purple-600',
  M: 'from-pink-500 to-fuchsia-600', N: 'from-rose-500 to-red-600', O: 'from-emerald-500 to-teal-600',
  P: 'from-primary-500 to-violet-600', Q: 'from-sky-500 to-blue-600', R: 'from-accent-500 to-orange-600',
  S: 'from-emerald-500 to-cyan-600', T: 'from-violet-500 to-purple-600', U: 'from-rose-500 to-pink-600',
  V: 'from-sky-500 to-indigo-600', W: 'from-amber-500 to-orange-600', X: 'from-teal-500 to-green-600',
  Y: 'from-indigo-500 to-violet-600', Z: 'from-fuchsia-500 to-pink-600',
}

export function getAvatarGradient(name) {
  const letter = (name || '').charAt(0).toUpperCase()
  return AVATAR_GRADIENTS[letter] || 'from-primary-500 to-violet-600'
}

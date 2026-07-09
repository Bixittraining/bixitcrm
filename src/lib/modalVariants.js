// Shared framer-motion variants for every modal/dialog in the app.
// Baseline lifted from the Add Lead modal (src/pages/Leads.jsx) so every
// modal opens/closes with the same fade + scale-down transition.
export const modalOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

export const modalCardVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } },
}

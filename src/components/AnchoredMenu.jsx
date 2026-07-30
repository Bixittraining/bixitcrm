import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

// Renders `children` in a portal at document.body, positioned with
// position:fixed against `anchorEl`'s live bounding rect, instead of
// `absolute` inside the triggering row. Table rows live inside an
// `overflow-x-auto` wrapper (and are `layout`-animated by framer-motion,
// which applies a transform) — both create a containing block that
// clips or hijacks the position of an `absolute` dropdown nested inside
// them, which is what caused menus to render detached from their row.
// Portaling to <body> sidesteps that entirely. Flips upward automatically
// when there isn't room below the anchor.
export default function AnchoredMenu({ anchorEl, onClose, align = 'right', children }) {
  const ref = useRef(null)
  const [style, setStyle] = useState(null)

  useLayoutEffect(() => {
    if (!anchorEl) return
    const place = () => {
      const rect = anchorEl.getBoundingClientRect()
      const menuEl = ref.current
      const menuHeight = menuEl?.offsetHeight || 0
      const menuWidth = menuEl?.offsetWidth || 224
      const spaceBelow = window.innerHeight - rect.bottom
      const openUpward = menuHeight > 0 && spaceBelow < menuHeight + 8
      const top = openUpward ? rect.top - menuHeight - 4 : rect.bottom + 4
      const rawLeft = align === 'right' ? rect.right - menuWidth : rect.left
      const left = Math.max(8, Math.min(rawLeft, window.innerWidth - menuWidth - 8))
      setStyle({ position: 'fixed', top: Math.max(8, top), left, zIndex: 100 })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchorEl, align])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target) && !anchorEl?.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose, anchorEl])

  if (!anchorEl) return null

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      style={style || { position: 'fixed', top: -9999, left: -9999 }}
    >
      {children}
    </motion.div>,
    document.body
  )
}

'use client'

import { motion } from 'framer-motion'

type Props = {
  children: React.ReactNode
  className?: string
  delay?: number
}

export default function FadeIn({ children, className, delay = 0 }: Props) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}

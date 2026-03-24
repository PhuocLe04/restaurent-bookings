'use client'

import { forwardRef, useRef, useState } from 'react'
import Link from 'next/link'
import UserListComponent from './components/index'
import type { ComponentProps } from 'react'
import { motion, easeOut } from 'framer-motion'
import 'animate.css'
import './page.css'

const UserList = forwardRef<
  { refresh: () => void } | null,
  Omit<ComponentProps<typeof UserListComponent>, 'ref'>
>((props, ref) => <UserListComponent {...props} ref={ref} />)

UserList.displayName = 'UserList'

export const dynamic = 'force-dynamic'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOut },
  },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: easeOut, delay: 0.15 },
  },
}

export default function UserPage() {
  const listRef = useRef<{ refresh: () => void } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  function handleRefreshPage() {
    setRefreshing(true)
    window.location.reload()
  }

  return (
    <motion.div
      className="admin-page"
      initial="hidden"
      animate="visible"
      variants={fadeIn}
    >
      <motion.div
        variants={fadeUp}
        className="animate__animated animate__fadeInDown"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <motion.h1
          className="admin-title"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
        >
          Quản lý người dùng
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          style={{ display: 'flex', gap: 10 }}
        >
          <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link href="/admin/user/create" className="user-btn user-primary">
              + Thêm người dùng
            </Link>
          </motion.div>

          <motion.button
            type="button"
            className="user-btn"
            onClick={handleRefreshPage}
            disabled={refreshing}
            whileHover={!refreshing ? { y: -2, scale: 1.02 } : {}}
            whileTap={!refreshing ? { scale: 0.97 } : {}}
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={
              refreshing
                ? { repeat: Infinity, duration: 0.9, ease: 'linear' }
                : { duration: 0.3 }
            }
          >
            {refreshing ? 'Đang làm mới...' : 'Làm mới'}
          </motion.button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="animate__animated animate__fadeInUp"
      >
        <UserList ref={listRef} />
      </motion.div>
    </motion.div>
  )
}

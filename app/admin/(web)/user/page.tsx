'use client'

import { forwardRef, useRef } from 'react'
import Link from 'next/link'
import UserListComponent from './components/index'
import type { ComponentProps } from 'react'

const UserList = forwardRef<
  { refresh: () => void } | null,
  Omit<ComponentProps<typeof UserListComponent>, 'ref'>
>((props, ref) => <UserListComponent {...props} ref={ref} />)
UserList.displayName = 'UserList'
import './page.css'

export const dynamic = 'force-dynamic'

export default function UserPage() {
  const listRef = useRef<{ refresh: () => void } | null>(null)

  return (
    <div className="admin-page">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h1 className="admin-title">Quản lý người dùng</h1>

        <div style={{ display: 'flex', gap: 10 }}>
          {/*Create */}
          <Link href="/admin/user/create" className="user-btn user-primary">
            + Thêm người dùng
          </Link>

          {/* Refresh */}
          <button
            className="user-btn"
            onClick={() => listRef.current?.refresh()}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* List */}
      <UserList ref={listRef} />
    </div>
  )
}

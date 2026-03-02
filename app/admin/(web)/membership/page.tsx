'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { MembershipList, type MembershipListRef } from './components'
import './page.css'

export default function MembershipPage() {
  const listRef = useRef<MembershipListRef>(null)

  return (
    <div className="member-page">
      <div className="member-head">
        <div>
          <h1 className="admin-title">Quản lý hạng thành viên</h1>
        </div>

        <div className="member-head-actions">
          <Link
            className="member-btn member-primary"
            href="/admin/membership/create"
          >
            + Tạo hạng
          </Link>
          <button
            className="member-btn"
            onClick={() => listRef.current?.refresh()}
          >
            Làm mới
          </button>
        </div>
      </div>

      <MembershipList ref={listRef} />
    </div>
  )
}

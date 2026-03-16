'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import LiquidGlassMessage, {
  type LiquidGlassMessageProps,
  type MessageType,
} from './LiquidGlassMessage'

type ToastState = {
  id: number
  visible: boolean
  type: MessageType
  title?: string
  message: string
  loading: boolean
  autoClose: number
}

type ToastContextType = {
  showMessage: (
    message: string,
    type?: MessageType,
    title?: string,
    options?: {
      loading?: boolean
      autoClose?: number
    },
  ) => void
  showSuccess: (
    message: string,
    title?: string,
    options?: {
      loading?: boolean
      autoClose?: number
    },
  ) => void
  showError: (
    message: string,
    title?: string,
    options?: {
      loading?: boolean
      autoClose?: number
    },
  ) => void
  showWarning: (
    message: string,
    title?: string,
    options?: {
      loading?: boolean
      autoClose?: number
    },
  ) => void
  showInfo: (
    message: string,
    title?: string,
    options?: {
      loading?: boolean
      autoClose?: number
    },
  ) => void
  hideMessage: () => void
}

const LiquidToastContext = createContext<ToastContextType | null>(null)

export function LiquidToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    id: 0,
    visible: false,
    type: 'info',
    title: undefined,
    message: '',
    loading: false,
    autoClose: 4000,
  })

  const idRef = useRef(0)
  const lastShownRef = useRef<{
    message: string
    type: MessageType
    title?: string
    time: number
  } | null>(null)

  const hideMessage = useCallback(() => {
    setToast((prev) => {
      if (!prev.visible) return prev
      return { ...prev, visible: false }
    })
  }, [])

  const showMessage = useCallback(
    (
      message: string,
      type: MessageType = 'info',
      title?: string,
      options?: {
        loading?: boolean
        autoClose?: number
      },
    ) => {
      const now = Date.now()
      const last = lastShownRef.current

      const isDuplicate =
        last &&
        last.message === message &&
        last.type === type &&
        last.title === title &&
        now - last.time < 1000

      if (isDuplicate) return

      idRef.current += 1

      lastShownRef.current = {
        message,
        type,
        title,
        time: now,
      }

      setToast({
        id: idRef.current,
        visible: true,
        type,
        title,
        message,
        loading: options?.loading ?? false,
        autoClose: options?.autoClose ?? 4000,
      })
    },
    [],
  )

  const value = useMemo<ToastContextType>(
    () => ({
      showMessage,
      hideMessage,
      showSuccess: (message, title, options) =>
        showMessage(message, 'success', title, options),
      showError: (message, title, options) =>
        showMessage(message, 'error', title, options),
      showWarning: (message, title, options) =>
        showMessage(message, 'warning', title, options),
      showInfo: (message, title, options) =>
        showMessage(message, 'info', title, options),
    }),
    [showMessage, hideMessage],
  )

  const toastProps: LiquidGlassMessageProps = {
    type: toast.type,
    title: toast.title,
    message: toast.message,
    isVisible: toast.visible,
    onClose: hideMessage,
    autoClose: toast.autoClose,
    showIcon: true,
    showCloseButton: true,
    glassIntensity: 'medium',
    bubbleEffect: true,
    glowEffect: true,
    position: 'top-right',
    toastKey: toast.id,
    loading: toast.loading,
  }

  return (
    <LiquidToastContext.Provider value={value}>
      {children}
      <LiquidGlassMessage {...toastProps} />
    </LiquidToastContext.Provider>
  )
}

export function useLiquidToast() {
  const context = useContext(LiquidToastContext)

  if (!context) {
    throw new Error('useLiquidToast must be used within LiquidToastProvider')
  }

  return context
}

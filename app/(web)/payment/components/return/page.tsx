export default function MoMoReturnPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const pick = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v

  const resultCode = pick(searchParams.resultCode)
  const orderId = pick(searchParams.orderId)
  const message = pick(searchParams.message)

  const success = resultCode === '0'

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', textAlign: 'center' }}>
      <h1>{success ? 'Thanh toán thành công' : 'Thanh toán thất bại'}</h1>

      <p>Order: {orderId}</p>
      <p>{message}</p>

      <a href="/">Về trang chủ</a>

      <p style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
        * Trạng thái cuối cùng được xác nhận qua IPN
      </p>
    </div>
  )
}

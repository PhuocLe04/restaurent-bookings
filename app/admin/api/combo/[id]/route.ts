import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'

export const dynamic = 'force-dynamic'

function parseId(id: string) {
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeBoolean(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (v === 'true' || v === '1') return true
    if (v === 'false' || v === '0') return false
  }

  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }

  return fallback
}

function parseNumber(value: unknown, fallback = NaN) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toPositiveInt(value: unknown, fallback = 1) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

type ComboMenuInput = {
  menu_item_id: number
  quantity?: number
}

type ComboServiceInput = {
  service_id: number
  quantity?: number
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const { id } = await params
    const comboId = parseId(id)

    if (!comboId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const item = await prisma.combo.findUnique({
      where: { id: comboId },
      include: {
        combo_menu_items: {
          include: {
            menu_items: {
              include: {
                categories: true,
              },
            },
          },
          orderBy: {
            menu_item_id: 'asc',
          },
        },
        combo_services: {
          include: {
            services: true,
          },
          orderBy: {
            service_id: 'asc',
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy combo' },
        { status: 404 },
      )
    }

    return NextResponse.json({ item })
  } catch (error: any) {
    console.error('GET /api/admin/combo/[id] error:', error)
    return NextResponse.json(
      { message: 'Lỗi server', detail: error?.message },
      { status: 500 },
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const { id } = await params
    const comboId = parseId(id)

    if (!comboId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { message: 'Dữ liệu không hợp lệ' },
        { status: 400 },
      )
    }

    const exists = await prisma.combo.findUnique({
      where: { id: comboId },
      include: {
        combo_menu_items: true,
        combo_services: true,
      },
    })

    if (!exists) {
      return NextResponse.json(
        { message: 'Không tìm thấy combo' },
        { status: 404 },
      )
    }

    const title = normalizeString(body.title)
    const description = normalizeString(body.description) || null
    const discount_percent =
      body.discount_percent === null ||
      body.discount_percent === undefined ||
      body.discount_percent === ''
        ? 0
        : parseNumber(body.discount_percent, 0)

    const is_active = normalizeBoolean(body.is_active, true)

    const menuItemsInput: ComboMenuInput[] = Array.isArray(body.menu_items)
      ? body.menu_items
      : []

    const servicesInput: ComboServiceInput[] = Array.isArray(body.services)
      ? body.services
      : []

    if (!title) {
      return NextResponse.json(
        { message: 'Tên combo là bắt buộc' },
        { status: 400 },
      )
    }

    if (
      !Number.isFinite(discount_percent) ||
      discount_percent < 0 ||
      discount_percent > 100
    ) {
      return NextResponse.json(
        { message: 'Phần trăm giảm giá không hợp lệ' },
        { status: 400 },
      )
    }

    if (menuItemsInput.length === 0 && servicesInput.length === 0) {
      return NextResponse.json(
        { message: 'Combo phải có ít nhất 1 món hoặc 1 dịch vụ' },
        { status: 400 },
      )
    }

    const normalizedMenuItems = menuItemsInput.map((item) => ({
      menu_item_id: toPositiveInt(item.menu_item_id, 0),
      quantity: toPositiveInt(item.quantity, 1),
    }))

    const normalizedServices = servicesInput.map((item) => ({
      service_id: toPositiveInt(item.service_id, 0),
      quantity: toPositiveInt(item.quantity, 1),
    }))

    if (normalizedMenuItems.some((item) => item.menu_item_id <= 0)) {
      return NextResponse.json(
        { message: 'Danh sách món ăn không hợp lệ' },
        { status: 400 },
      )
    }

    if (normalizedServices.some((item) => item.service_id <= 0)) {
      return NextResponse.json(
        { message: 'Danh sách dịch vụ không hợp lệ' },
        { status: 400 },
      )
    }

    const menuIds = [
      ...new Set(normalizedMenuItems.map((item) => item.menu_item_id)),
    ]
    const serviceIds = [
      ...new Set(normalizedServices.map((item) => item.service_id)),
    ]

    const [menuRecords, serviceRecords] = await Promise.all([
      menuIds.length
        ? prisma.menu_items.findMany({
            where: { id: { in: menuIds } },
            select: {
              id: true,
              name: true,
              price: true,
            },
          })
        : Promise.resolve([]),
      serviceIds.length
        ? prisma.services.findMany({
            where: { id: { in: serviceIds } },
            select: {
              id: true,
              name: true,
              price: true,
            },
          })
        : Promise.resolve([]),
    ])

    if (menuRecords.length !== menuIds.length) {
      return NextResponse.json(
        { message: 'Có món ăn không tồn tại trong hệ thống' },
        { status: 400 },
      )
    }

    if (serviceRecords.length !== serviceIds.length) {
      return NextResponse.json(
        { message: 'Có dịch vụ không tồn tại trong hệ thống' },
        { status: 400 },
      )
    }

    const menuMap = new Map(menuRecords.map((item) => [item.id, item]))
    const serviceMap = new Map(serviceRecords.map((item) => [item.id, item]))

    const discountRate = 1 - discount_percent / 100

    const comboMenuItemsData = normalizedMenuItems.map((item) => {
      const menu = menuMap.get(item.menu_item_id)
      if (!menu) {
        throw new Error(`Không tìm thấy món ăn #${item.menu_item_id}`)
      }

      const originalUnitPrice = Number(menu.price ?? 0)
      const discountedUnitPrice = Math.max(
        0,
        Math.round(originalUnitPrice * discountRate),
      )

      return {
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        original_unit_price: originalUnitPrice,
        unit_price: discountedUnitPrice,
      }
    })

    const comboServicesData = normalizedServices.map((item) => {
      const service = serviceMap.get(item.service_id)
      if (!service) {
        throw new Error(`Không tìm thấy dịch vụ #${item.service_id}`)
      }

      const originalUnitPrice = Number(service.price ?? 0)
      const discountedUnitPrice = Math.max(
        0,
        Math.round(originalUnitPrice * discountRate),
      )

      return {
        service_id: item.service_id,
        quantity: item.quantity,
        original_unit_price: originalUnitPrice,
        unit_price: discountedUnitPrice,
      }
    })

    const total_origin_price =
      comboMenuItemsData.reduce(
        (sum, item) => sum + item.original_unit_price * item.quantity,
        0,
      ) +
      comboServicesData.reduce(
        (sum, item) => sum + item.original_unit_price * item.quantity,
        0,
      )

    const sale_price =
      comboMenuItemsData.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
      ) +
      comboServicesData.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
      )

    const oldMenuCount = exists.combo_menu_items.length
    const oldServiceCount = exists.combo_services.length

    const updated = await prisma.$transaction(async (tx) => {
      await tx.combo_menu_items.deleteMany({
        where: { combo_id: comboId },
      })

      await tx.combo_services.deleteMany({
        where: { combo_id: comboId },
      })

      const combo = await tx.combo.update({
        where: { id: comboId },
        data: {
          title,
          description,
          total_origin_price,
          sale_price,
          discount_percent,
          is_active,
          combo_menu_items: comboMenuItemsData.length
            ? {
                create: comboMenuItemsData.map((item) => ({
                  menu_item_id: item.menu_item_id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                })),
              }
            : undefined,
          combo_services: comboServicesData.length
            ? {
                create: comboServicesData.map((item) => ({
                  service_id: item.service_id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                })),
              }
            : undefined,
        },
        include: {
          combo_menu_items: {
            include: {
              menu_items: {
                include: {
                  categories: true,
                },
              },
            },
            orderBy: {
              menu_item_id: 'asc',
            },
          },
          combo_services: {
            include: {
              services: true,
            },
            orderBy: {
              service_id: 'asc',
            },
          },
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'combo',
          entity_id: combo.id,
          action: 'UPDATE',
          description: `Admin #${access.userId} cập nhật combo #${combo.id} - ${combo.title}. Món: ${oldMenuCount} -> ${combo.combo_menu_items.length}, dịch vụ: ${oldServiceCount} -> ${combo.combo_services.length}`,
          user_id: access.userId,
        },
      })

      return combo
    })

    return NextResponse.json({
      message: 'Cập nhật combo thành công',
      item: updated,
    })
  } catch (error: any) {
    console.error('PUT /api/admin/combo/[id] error:', error)
    return NextResponse.json(
      { message: 'Lỗi server', detail: error?.message },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const { id } = await params
    const comboId = parseId(id)

    if (!comboId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const exists = await prisma.combo.findUnique({
      where: { id: comboId },
      include: {
        combo_menu_items: true,
        combo_services: true,
      },
    })

    if (!exists) {
      return NextResponse.json(
        { message: 'Không tìm thấy combo' },
        { status: 404 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.combo_menu_items.deleteMany({
        where: { combo_id: comboId },
      })

      await tx.combo_services.deleteMany({
        where: { combo_id: comboId },
      })

      await tx.combo.delete({
        where: { id: comboId },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'combo',
          entity_id: comboId,
          action: 'DELETE',
          description: `Admin #${access.userId} xóa combo #${comboId} - ${exists.title}. Đã xóa ${exists.combo_menu_items.length} món và ${exists.combo_services.length} dịch vụ liên quan`,
          user_id: access.userId,
        },
      })
    })

    return NextResponse.json({
      message: 'Xóa combo thành công',
    })
  } catch (error: any) {
    console.error('DELETE /api/admin/combo/[id] error:', error)
    return NextResponse.json(
      { message: 'Lỗi server', detail: error?.message },
      { status: 500 },
    )
  }
}

import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

router.use(requireAuth);

const productListQuery = z.object({
  salonId: z.string(),
  category: z.string().optional(),
  search: z.string().optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

router.get("/products", validate(productListQuery, "query"), asyncHandler(async (req, res) => {
  const { salonId, category, search, active, page, limit } = getValidated<z.infer<typeof productListQuery>>(req);
  const where: Record<string, unknown> = { salonId };
  if (category) where.category = category;
  if (active !== undefined) where.active = active;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
    ];
  }
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: "asc" },
      include: { inventory: true },
    }),
    prisma.product.count({ where }),
  ]);
  res.json({ products, total, page, limit, pages: Math.ceil(total / limit) });
}));

router.get("/products/:id", asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { inventory: true, stockHistory: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!product) throw new ApiError(404, "Product not found");
  res.json({ product });
}));

const productSchema = z.object({
  salonId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  unitPrice: z.number().int(),
  sellingPrice: z.number().int(),
  unit: z.string().min(1),
  minStock: z.number().int().optional(),
  imageUrl: z.string().url().optional(),
});

router.post("/products", requireRole("OWNER", "ADMIN", "MANAGER"), validate(productSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof productSchema>>(req);
  const product = await prisma.product.create({ data });
  await prisma.inventory.create({
    data: { salonId: data.salonId, productId: product.id, quantity: 0 },
  });
  res.status(201).json({ product });
}));

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  unitPrice: z.number().int().optional(),
  sellingPrice: z.number().int().optional(),
  unit: z.string().min(1).optional(),
  minStock: z.number().int().optional(),
  imageUrl: z.string().url().optional(),
  active: z.boolean().optional(),
});

router.put("/products/:id", requireRole("OWNER", "ADMIN", "MANAGER"), validate(updateProductSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof updateProductSchema>>(req);
  const product = await prisma.product.update({ where: { id: req.params.id }, data });
  res.json({ product });
}));

router.delete("/products/:id", requireRole("OWNER", "ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { active: false },
  });
  res.json({ product });
}));

const stockQuery = z.object({
  salonId: z.string(),
  lowStock: z.coerce.boolean().optional(),
});

router.get("/stock", validate(stockQuery, "query"), asyncHandler(async (req, res) => {
  const { salonId, lowStock } = getValidated<z.infer<typeof stockQuery>>(req);
  const where: Record<string, unknown> = { salonId };
  if (lowStock) where.quantity = { lte: 0 };
  const stock = await prisma.inventory.findMany({
    where,
    include: { product: true },
    orderBy: { updatedAt: "desc" },
  });
  // If lowStock=true, also include items where quantity <= minStock
  let result = stock;
  if (lowStock) {
    result = stock.filter((s) => s.quantity <= s.product.minStock);
  }
  res.json({ stock: result });
}));

const stockUpdateSchema = z.object({
  quantity: z.number().int().min(0),
  location: z.string().optional(),
});

router.put("/stock/:productId", requireRole("OWNER", "ADMIN", "MANAGER"), validate(stockUpdateSchema), asyncHandler(async (req, res) => {
  const { salonId } = req.query as { salonId: string };
  if (!salonId) throw new ApiError(400, "salonId is required");
  const data = getValidated<z.infer<typeof stockUpdateSchema>>(req);
  const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
  if (!product) throw new ApiError(404, "Product not found");
  const inventory = await prisma.inventory.upsert({
    where: { salonId_productId: { salonId, productId: req.params.productId } },
    update: { quantity: data.quantity, location: data.location },
    create: { salonId, productId: req.params.productId, quantity: data.quantity, location: data.location },
  });
  res.json({ inventory });
}));

const stockHistoryQuery = z.object({
  salonId: z.string(),
  productId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

router.get("/stock/history", validate(stockHistoryQuery, "query"), asyncHandler(async (req, res) => {
  const { salonId, productId, from, to, page, limit } = getValidated<z.infer<typeof stockHistoryQuery>>(req);
  const where: any = { salonId };
  if (productId) where.productId = productId;
  if (from || to) {
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    where.createdAt = dateFilter;
  }
  const [history, total] = await Promise.all([
    prisma.stockHistory.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { id: true, name: true, sku: true } } },
    }),
    prisma.stockHistory.count({ where }),
  ]);
  res.json({ history, total, page, limit, pages: Math.ceil(total / limit) });
}));

const stockAdjustSchema = z.object({
  salonId: z.string(),
  productId: z.string(),
  change: z.number().int(),
  reason: z.enum(["PURCHASE", "SALE", "ADJUSTMENT", "DAMAGE", "EXPIRY"]),
  referenceId: z.string().optional(),
  note: z.string().optional(),
});

router.post("/stock/adjust", requireRole("OWNER", "ADMIN", "MANAGER"), validate(stockAdjustSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof stockAdjustSchema>>(req);
  const inventory = await prisma.inventory.findUnique({
    where: { salonId_productId: { salonId: data.salonId, productId: data.productId } },
  });
  if (!inventory) throw new ApiError(404, "Inventory record not found");
  const newQty = inventory.quantity + data.change;
  if (newQty < 0) throw new ApiError(400, "Insufficient stock");
  const [updated, _history] = await Promise.all([
    prisma.inventory.update({
      where: { salonId_productId: { salonId: data.salonId, productId: data.productId } },
      data: { quantity: newQty },
    }),
    prisma.stockHistory.create({
      data: {
        salonId: data.salonId,
        productId: data.productId,
        change: data.change,
        balanceAfter: newQty,
        reason: data.reason,
        referenceId: data.referenceId,
        note: data.note,
      },
    }),
  ]);
  res.json({ inventory: updated });
}));

router.get("/suppliers", asyncHandler(async (req, res) => {
  const { salonId } = req.query as { salonId?: string };
  if (!salonId) throw new ApiError(400, "salonId is required");
  const suppliers = await prisma.supplier.findMany({
    where: { salonId, active: true },
    orderBy: { name: "asc" },
  });
  res.json({ suppliers });
}));

const supplierSchema = z.object({
  salonId: z.string(),
  name: z.string().min(1).max(200),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/suppliers", requireRole("OWNER", "ADMIN", "MANAGER"), validate(supplierSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof supplierSchema>>(req);
  const supplier = await prisma.supplier.create({ data });
  res.status(201).json({ supplier });
}));

const updateSupplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});

router.put("/suppliers/:id", requireRole("OWNER", "ADMIN", "MANAGER"), validate(updateSupplierSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof updateSupplierSchema>>(req);
  const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
  res.json({ supplier });
}));

const poListQuery = z.object({
  salonId: z.string(),
  status: z.string().optional(),
});

router.get("/purchase-orders", validate(poListQuery, "query"), asyncHandler(async (req, res) => {
  const { salonId, status } = getValidated<z.infer<typeof poListQuery>>(req);
  const orders = await prisma.purchaseOrder.findMany({
    where: { salonId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { supplier: { select: { id: true, name: true } } },
  });
  res.json({ orders });
}));

const poSchema = z.object({
  salonId: z.string(),
  supplierId: z.string().optional(),
  poNumber: z.string().min(1),
  totalAmount: z.number().int(),
  notes: z.string().optional(),
});

router.post("/purchase-orders", requireRole("OWNER", "ADMIN", "MANAGER"), validate(poSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof poSchema>>(req);
  const order = await prisma.purchaseOrder.create({ data });
  res.status(201).json({ order });
}));

const poStatusSchema = z.object({
  status: z.enum(["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"]),
});

router.put("/purchase-orders/:id/status", requireRole("OWNER", "ADMIN", "MANAGER"), validate(poStatusSchema), asyncHandler(async (req, res) => {
  const { status } = getValidated<z.infer<typeof poStatusSchema>>(req);
  const data: Record<string, unknown> = { status };
  if (status === "ORDERED") data.orderedAt = new Date();
  if (status === "RECEIVED") data.receivedAt = new Date();
  const order = await prisma.purchaseOrder.update({ where: { id: req.params.id }, data });
  res.json({ order });
}));

const expenseListQuery = z.object({
  salonId: z.string(),
  category: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

router.get("/expenses", validate(expenseListQuery, "query"), asyncHandler(async (req, res) => {
  const { salonId, category, from, to, page, limit } = getValidated<z.infer<typeof expenseListQuery>>(req);
  const where: any = { salonId };
  if (category) where.category = category;
  if (from || to) {
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    where.date = dateFilter;
  }
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: "desc" },
    }),
    prisma.expense.count({ where }),
  ]);
  res.json({ expenses, total, page, limit, pages: Math.ceil(total / limit) });
}));

const expenseSchema = z.object({
  salonId: z.string(),
  category: z.string().min(1),
  amount: z.number().int(),
  description: z.string().min(1),
  date: z.string().datetime(),
  receiptUrl: z.string().url().optional(),
  recurring: z.boolean().optional(),
  interval: z.string().optional(),
});

router.post("/expenses", requireRole("OWNER", "ADMIN", "MANAGER"), validate(expenseSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof expenseSchema>>(req);
  const expense = await prisma.expense.create({
    data: { ...data, date: new Date(data.date) },
  });
  res.status(201).json({ expense });
}));

router.delete("/expenses/:id", requireRole("OWNER", "ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

export default router;

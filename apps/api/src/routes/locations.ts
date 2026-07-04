import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

router.get("/countries", asyncHandler(async (_req, res) => {
  const countries = await prisma.country.findMany({ orderBy: { name: "asc" } });
  res.json({ countries });
}));

router.get("/countries/:id", asyncHandler(async (req, res) => {
  const country = await prisma.country.findUnique({
    where: { id: req.params.id },
    include: { states: { orderBy: { name: "asc" } } },
  });
  if (!country) throw new ApiError(404, "Country not found");
  res.json({ country });
}));

router.get("/states", asyncHandler(async (req, res) => {
  const { countryId } = req.query;
  const where: Record<string, unknown> = {};
  if (countryId) where.countryId = countryId;
  const states = await prisma.state.findMany({ where: where as any, orderBy: { name: "asc" } });
  res.json({ states });
}));

router.get("/states/:id", asyncHandler(async (req, res) => {
  const state = await prisma.state.findUnique({
    where: { id: req.params.id },
    include: { cities: { orderBy: { name: "asc" } } },
  });
  if (!state) throw new ApiError(404, "State not found");
  res.json({ state });
}));

router.get("/cities", asyncHandler(async (req, res) => {
  const { stateId, countryId, search } = req.query;
  const where: Record<string, unknown> = {};
  if (stateId) where.stateId = stateId;
  if (countryId) where.countryId = countryId;
  if (search) where.name = { contains: search as string, mode: "insensitive" } as any;
  const cities = await prisma.city.findMany({ where: where as any, orderBy: { name: "asc" } });
  res.json({ cities });
}));

router.get("/cities/:id", asyncHandler(async (req, res) => {
  const city = await prisma.city.findUnique({
    where: { id: req.params.id },
    include: { areas: { orderBy: { name: "asc" } } },
  });
  if (!city) throw new ApiError(404, "City not found");
  res.json({ city });
}));

router.get("/areas", asyncHandler(async (req, res) => {
  const { cityId, search } = req.query;
  const where: Record<string, unknown> = {};
  if (cityId) where.cityId = cityId;
  if (search) where.name = { contains: search as string, mode: "insensitive" } as any;
  const areas = await prisma.area.findMany({ where: where as any, orderBy: { name: "asc" } });
  res.json({ areas });
}));

router.get("/areas/:id", asyncHandler(async (req, res) => {
  const area = await prisma.area.findUnique({ where: { id: req.params.id } });
  if (!area) throw new ApiError(404, "Area not found");
  res.json({ area });
}));

export default router;

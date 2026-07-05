/**
 * API smoke tests — run against a live API (default http://localhost:4000).
 *
 *   npm test                      (API + database must be running)
 *   API_URL=https://... npm test  (test a deployed instance)
 *
 * Uses Node's built-in test runner: no extra dependencies.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.API_URL || "http://localhost:4000";
const PASSWORD = "TestPass123!";

async function req(method, path, { body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON response */ }
  return { status: res.status, data };
}

const state = {};

before(async () => {
  try {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);
  } catch {
    throw new Error(`API is not reachable at ${BASE} — start it with: npm run dev:api`);
  }
});

test("health check", async () => {
  const { status, data } = await req("GET", "/health");
  assert.equal(status, 200);
  assert.equal(data.ok, true);
});

test("register a new customer", async () => {
  state.email = `smoke${Date.now()}@example.com`;
  const { status, data } = await req("POST", "/api/auth/register", {
    body: { name: "Smoke Test", email: state.email, password: PASSWORD },
  });
  assert.equal(status, 201);
  assert.ok(data.accessToken);
  state.token = data.accessToken;
  state.refreshToken = data.refreshToken;
});

test("login with correct password", async () => {
  const { status, data } = await req("POST", "/api/auth/login", {
    body: { email: state.email, password: PASSWORD },
  });
  assert.equal(status, 200);
  assert.equal(data.user.email, state.email);
});

test("login with wrong password is rejected", async () => {
  const { status } = await req("POST", "/api/auth/login", {
    body: { email: state.email, password: "WrongPass1!" },
  });
  assert.equal(status, 401);
});

test("authenticated /me returns the user", async () => {
  const { status, data } = await req("GET", "/api/auth/me", { token: state.token });
  assert.equal(status, 200);
  assert.equal(data.user.email, state.email);
});

test("refresh token rotates", async () => {
  const { status, data } = await req("POST", "/api/auth/refresh", {
    body: { refreshToken: state.refreshToken },
  });
  assert.equal(status, 200);
  assert.ok(data.accessToken);
  state.token = data.accessToken;
});

test("salons list returns seeded salons", async () => {
  const { status, data } = await req("GET", "/api/salons?limit=3");
  assert.equal(status, 200);
  assert.ok(data.salons.length > 0, "expected at least one salon (did the seed run?)");
  state.salon = data.salons[0];
});

test("salon detail includes services and packages", async () => {
  const { status, data } = await req("GET", `/api/salons/${state.salon.slug}`);
  assert.equal(status, 200);
  assert.ok(data.salon.services.length > 0);
  assert.ok(Array.isArray(data.salon.packages));
  state.service = data.salon.services[0];
});

test("slot availability returns open slots", async () => {
  const date = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { status, data } = await req(
    "GET",
    `/api/bookings/slots/available?salonId=${state.salon.id}&date=${date}&durationMin=${state.service.durationMin}`,
    { token: state.token },
  );
  assert.equal(status, 200);
  const free = data.slots.filter((s) => s.available);
  assert.ok(free.length > 0, "expected at least one available slot (are Staff rows seeded?)");
  state.date = date;
  state.slot = free[free.length - 1]; // last slot of the day: least likely to collide
});

test("booking lifecycle: create, duplicate blocked, cancel", async () => {
  const hh = String(Math.floor(state.slot.startMin / 60)).padStart(2, "0");
  const mm = String(state.slot.startMin % 60).padStart(2, "0");
  const body = {
    salonSlug: state.salon.slug,
    serviceIds: [state.service.id],
    date: state.date,
    time: `${hh}:${mm}`,
    paymentMethod: "CASH",
  };

  const created = await req("POST", "/api/bookings", { body, token: state.token });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const bookingId = created.data.booking.id;

  const duplicate = await req("POST", "/api/bookings", { body, token: state.token });
  assert.ok(duplicate.status >= 400, "double-booking must be rejected");

  const cancelled = await req("POST", `/api/bookings/${bookingId}/cancel`, { token: state.token });
  assert.equal(cancelled.status, 200);
});

test("membership plans are public", async () => {
  const { status, data } = await req("GET", "/api/memberships/plans");
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.memberships));
});

test("admin endpoints reject customers", async () => {
  const { status } = await req("GET", "/api/admin/stats", { token: state.token });
  assert.ok(status === 401 || status === 403);
});

test("social login rejects invalid tokens", async () => {
  const { status } = await req("POST", "/api/auth/social", {
    body: { provider: "GOOGLE", token: "invalid-token" },
  });
  assert.equal(status, 401);
});

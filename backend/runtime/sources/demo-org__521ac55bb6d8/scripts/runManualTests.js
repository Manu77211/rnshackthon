/* eslint-disable no-console */
const baseUrl = process.env.BASE_URL || "http://localhost:5000";

const now = Date.now();
const analystEmail = `analyst_${now}@zorvyn.com`;
const viewerEmail = `viewer_${now}@zorvyn.com`;
const inactiveEmail = `inactive_${now}@zorvyn.com`;

const state = {
  adminToken: "",
  analystToken: "",
  viewerToken: "",
  analystId: null,
  viewerId: null,
  recordId: null,
};

const tests = [];

const safeJson = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
};

const callApi = async ({ name, method, path, token, body, expectStatus, after }) => {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await safeJson(response);
  const pass = response.status === expectStatus;

  tests.push({ name, method, path, expectStatus, actualStatus: response.status, pass });

  console.log(`\n[${pass ? "PASS" : "FAIL"}] ${name}`);
  console.log(`Expected: ${expectStatus} | Actual: ${response.status}`);
  console.log(`Response: ${JSON.stringify(payload, null, 2)}`);

  if (pass && typeof after === "function") {
    after(payload);
  }

  return payload;
};

const run = async () => {
  await callApi({
    name: "Health check",
    method: "GET",
    path: "/health",
    expectStatus: 200,
  });

  await callApi({
    name: "Register invalid role",
    method: "POST",
    path: "/api/auth/register",
    expectStatus: 400,
    body: {
      name: "Bad Role",
      email: `bad_role_${now}@zorvyn.com`,
      password: "Password123!",
      role: "superadmin",
    },
  });

  await callApi({
    name: "Register analyst success",
    method: "POST",
    path: "/api/auth/register",
    expectStatus: 201,
    body: {
      name: "API Analyst",
      email: analystEmail,
      password: "Password123!",
      role: "analyst",
      status: "active",
    },
    after: (payload) => {
      state.analystId = payload?.user?.id;
    },
  });

  await callApi({
    name: "Register viewer success",
    method: "POST",
    path: "/api/auth/register",
    expectStatus: 201,
    body: {
      name: "Dashboard Viewer",
      email: viewerEmail,
      password: "Password123!",
      role: "viewer",
      status: "active",
    },
    after: (payload) => {
      state.viewerId = payload?.user?.id;
    },
  });

  await callApi({
    name: "Register inactive user",
    method: "POST",
    path: "/api/auth/register",
    expectStatus: 201,
    body: {
      name: "Inactive User",
      email: inactiveEmail,
      password: "Password123!",
      role: "viewer",
      status: "inactive",
    },
  });

  await callApi({
    name: "Register duplicate email",
    method: "POST",
    path: "/api/auth/register",
    expectStatus: 400,
    body: {
      name: "Duplicate Analyst",
      email: analystEmail,
      password: "Password123!",
      role: "analyst",
    },
  });

  await callApi({
    name: "Login wrong password",
    method: "POST",
    path: "/api/auth/login",
    expectStatus: 401,
    body: {
      email: analystEmail,
      password: "wrong-password",
    },
  });

  await callApi({
    name: "Login inactive user",
    method: "POST",
    path: "/api/auth/login",
    expectStatus: 403,
    body: {
      email: inactiveEmail,
      password: "Password123!",
    },
  });

  await callApi({
    name: "Login analyst success",
    method: "POST",
    path: "/api/auth/login",
    expectStatus: 200,
    body: {
      email: analystEmail,
      password: "Password123!",
    },
    after: (payload) => {
      state.analystToken = payload?.token || "";
    },
  });

  await callApi({
    name: "Login viewer success",
    method: "POST",
    path: "/api/auth/login",
    expectStatus: 200,
    body: {
      email: viewerEmail,
      password: "Password123!",
    },
    after: (payload) => {
      state.viewerToken = payload?.token || "";
    },
  });

  await callApi({
    name: "Login admin success",
    method: "POST",
    path: "/api/auth/login",
    expectStatus: 200,
    body: {
      email: "admin@example.com",
      password: "admin123",
    },
    after: (payload) => {
      state.adminToken = payload?.token || "";
    },
  });

  await callApi({
    name: "Get users without auth",
    method: "GET",
    path: "/api/users",
    expectStatus: 401,
  });

  await callApi({
    name: "Get users with analyst token",
    method: "GET",
    path: "/api/users",
    token: state.analystToken,
    expectStatus: 403,
  });

  await callApi({
    name: "Get users with admin token",
    method: "GET",
    path: "/api/users",
    token: state.adminToken,
    expectStatus: 200,
  });

  await callApi({
    name: "Create record as analyst forbidden",
    method: "POST",
    path: "/api/records",
    token: state.analystToken,
    expectStatus: 403,
    body: {
      amount: 1200,
      type: "income",
      category: "Freelance",
      date: "2026-04-01",
      description: "Freelance payment",
    },
  });

  await callApi({
    name: "Create record invalid amount",
    method: "POST",
    path: "/api/records",
    token: state.adminToken,
    expectStatus: 400,
    body: {
      amount: -5,
      type: "income",
      category: "Bad Amount",
      date: "2026-04-02",
    },
  });

  await callApi({
    name: "Create record success",
    method: "POST",
    path: "/api/records",
    token: state.adminToken,
    expectStatus: 201,
    body: {
      amount: 4200,
      type: "income",
      category: "Salary",
      date: "2026-04-03",
      description: "Monthly salary",
    },
    after: (payload) => {
      state.recordId = payload?.record?.id;
    },
  });

  await callApi({
    name: "Create expense record success",
    method: "POST",
    path: "/api/records",
    token: state.adminToken,
    expectStatus: 201,
    body: {
      amount: 600,
      type: "expense",
      category: "Rent",
      date: "2026-04-04",
      description: "Apartment rent",
    },
  });

  await callApi({
    name: "Get records as analyst",
    method: "GET",
    path: "/api/records?page=1&limit=5",
    token: state.analystToken,
    expectStatus: 200,
  });

  await callApi({
    name: "Get records as viewer forbidden",
    method: "GET",
    path: "/api/records",
    token: state.viewerToken,
    expectStatus: 403,
  });

  await callApi({
    name: "Get records filtered by type",
    method: "GET",
    path: "/api/records?type=income&page=1&limit=10",
    token: state.analystToken,
    expectStatus: 200,
  });

  await callApi({
    name: "Get record by id success",
    method: "GET",
    path: `/api/records/${state.recordId}`,
    token: state.analystToken,
    expectStatus: 200,
  });

  await callApi({
    name: "Get record by id not found",
    method: "GET",
    path: "/api/records/99999999",
    token: state.analystToken,
    expectStatus: 404,
  });

  await callApi({
    name: "Update record as analyst forbidden",
    method: "PUT",
    path: `/api/records/${state.recordId}`,
    token: state.analystToken,
    expectStatus: 403,
    body: { amount: 5000 },
  });

  await callApi({
    name: "Update record as admin success",
    method: "PUT",
    path: `/api/records/${state.recordId}`,
    token: state.adminToken,
    expectStatus: 200,
    body: { amount: 5000, description: "Salary adjusted" },
  });

  await callApi({
    name: "Dashboard summary as viewer",
    method: "GET",
    path: "/api/dashboard/summary",
    token: state.viewerToken,
    expectStatus: 200,
  });

  await callApi({
    name: "Dashboard category breakdown",
    method: "GET",
    path: "/api/dashboard/category-breakdown",
    token: state.analystToken,
    expectStatus: 200,
  });

  await callApi({
    name: "Dashboard recent",
    method: "GET",
    path: "/api/dashboard/recent",
    token: state.adminToken,
    expectStatus: 200,
  });

  await callApi({
    name: "Dashboard monthly trends",
    method: "GET",
    path: "/api/dashboard/monthly-trends",
    token: state.adminToken,
    expectStatus: 200,
  });

  await callApi({
    name: "Dashboard summary no auth",
    method: "GET",
    path: "/api/dashboard/summary",
    expectStatus: 401,
  });

  await callApi({
    name: "Update user role/status as admin",
    method: "PATCH",
    path: `/api/users/${state.viewerId}`,
    token: state.adminToken,
    expectStatus: 200,
    body: { role: "analyst", status: "inactive" },
  });

  await callApi({
    name: "Delete user as admin",
    method: "DELETE",
    path: `/api/users/${state.analystId}`,
    token: state.adminToken,
    expectStatus: 200,
  });

  await callApi({
    name: "Delete record as admin",
    method: "DELETE",
    path: `/api/records/${state.recordId}`,
    token: state.adminToken,
    expectStatus: 200,
  });

  const passed = tests.filter((test) => test.pass).length;
  console.log("\n=============================");
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${tests.length - passed}`);
  console.log("=============================\n");

  if (passed !== tests.length) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error("Manual test runner failed:", error);
  process.exit(1);
});

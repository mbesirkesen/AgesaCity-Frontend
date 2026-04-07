import { mockGameData } from '../mocks/mockGameData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8003';
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

function unwrapList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.value)) return response.value;
  return [];
}

async function fetchJSON(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

async function postJSON(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

async function deleteJSON(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

// --- Initial data ---

export async function loadGameData() {
  if (USE_MOCK) return mockGameData;

  try {
    const [usersRes, spendingsRes, scenariosRes, learningContentsRes, quizzesRes, quizOptionsRes] =
      await Promise.all([
        fetchJSON('/api/users?limit=5000'),
        fetchJSON('/api/spendings?limit=5000'),
        fetchJSON('/api/bes-scenarios'),
        fetchJSON('/api/learning-contents'),
        fetchJSON('/api/quizzes'),
        fetchJSON('/api/quiz-options'),
      ]);

    const users = unwrapList(usersRes);
    const spendings = unwrapList(spendingsRes);
    const scenarios = unwrapList(scenariosRes);
    const learningContents = unwrapList(learningContentsRes);
    const quizzes = unwrapList(quizzesRes);
    const quizOptions = unwrapList(quizOptionsRes);

    return {
      users,
      spendings,
      scenarios,
      learningContents,
      quizzes,
      quizOptions,
      personas: users,
    };
  } catch (err) {
    console.warn('Backend baglantisi basarisiz, mock veriye donuluyor:', err.message);
    return mockGameData;
  }
}

// --- Login ---

export async function loginUser(userId) {
  const result = await postJSON('/api/login', { user_id: userId });
  return result.data;
}

// --- City Status & Dashboard ---

export async function fetchCityStatus(userId) {
  return fetchJSON(`/api/city-status/${userId}`);
}

export async function fetchDashboard(userId) {
  return fetchJSON(`/api/dashboard/${userId}`);
}

// --- XP ---

export async function earnXPApi(userId, amount, reason) {
  return postJSON('/api/xp/earn', { user_id: userId, amount, reason });
}

// --- Financial Points ---

export async function earnFPApi(userId, amount, reason) {
  return postJSON('/api/financial-points/earn', { user_id: userId, amount, reason });
}

export async function spendFPApi(userId, amount, itemName, reason) {
  return postJSON('/api/financial-points/spend', { user_id: userId, amount, item_name: itemName, reason });
}

// --- Inventory ---

export async function buyInventoryApi(userId, itemId, itemName, priceFP, quantity = 1) {
  return postJSON('/api/inventory/buy', {
    user_id: userId, item_id: itemId, item_name: itemName,
    price_fp: priceFP, quantity,
  });
}

// --- City placement ---

export async function placeCityItemApi(userId, row, col, itemId, itemName) {
  return postJSON('/api/city/place', { user_id: userId, row, col, item_id: itemId, item_name: itemName });
}

export async function removeCityItemApi(userId, row, col) {
  return deleteJSON('/api/city/remove', { user_id: userId, row, col });
}

export async function buyAndPlaceCityApi(userId, itemId, itemName, priceFP, row, col) {
  return postJSON('/api/city/buy-and-place', {
    user_id: userId, item_id: itemId, item_name: itemName,
    price_fp: priceFP, row, col,
  });
}

// --- Quiz ---

export async function submitQuizApi(userId, questionId, selectedOptionId) {
  return postJSON('/api/quiz/submit', { user_id: userId, question_id: questionId, selected_option_id: selectedOptionId });
}

// --- Simulation ---

export async function runSimulationApi(userId) {
  return postJSON('/api/simulation/run', { user_id: userId });
}

// --- Disaster ---

export async function triggerDisasterApi(userId, severity = 2, fpPenalty = null) {
  const payload = { user_id: userId, severity };
  if (typeof fpPenalty === 'number' && Number.isFinite(fpPenalty) && fpPenalty > 0) {
    payload.fp_penalty = fpPenalty;
  }
  return postJSON('/api/disaster/trigger', payload);
}

// --- Spendings ---

export async function createSpending(payload) {
  return postJSON('/api/spendings', payload);
}

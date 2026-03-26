import { mockGameData } from '../mocks/mockGameData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8003';
const USE_MOCK =
  import.meta.env.VITE_USE_MOCK_DATA === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA !== 'false');

async function fetchJSON(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

export async function loadGameData() {
  if (USE_MOCK) return mockGameData;

  try {
    const [users, spendings, scenarios, learningContents, quizzes, quizOptions] =
      await Promise.all([
        fetchJSON('/api/users?limit=5000'),
        fetchJSON('/api/spendings?limit=5000'),
        fetchJSON('/api/bes-scenarios'),
        fetchJSON('/api/learning-contents'),
        fetchJSON('/api/quizzes'),
        fetchJSON('/api/quiz-options'),
      ]);

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

export async function fetchCityStatus(userId) {
  return fetchJSON(`/api/city-status/${userId}`);
}

export async function createSpending(payload) {
  const res = await fetch(`${BASE_URL}/api/spendings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Harcama olusturulamadi: ${res.status}`);
  return res.json();
}

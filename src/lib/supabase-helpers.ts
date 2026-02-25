// Neon API endpoints
const API_BASE = (import.meta as any).env?.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export async function fetchSettings() {
  const response = await fetch(`${API_BASE}/api/settings`);
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

export async function updateSettings(updates: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/api/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update settings');
}

export async function fetchTrends() {
  const response = await fetch(`${API_BASE}/api/trends`);
  if (!response.ok) throw new Error('Failed to fetch trends');
  return response.json();
}

export async function addTrend(topic: string) {
  const response = await fetch(`${API_BASE}/api/trends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, source: 'manual' }),
  });
  if (!response.ok) throw new Error('Failed to add trend');
}

export async function fetchPosts() {
  const response = await fetch(`${API_BASE}/api/posts`);
  if (!response.ok) throw new Error('Failed to fetch posts');
  return response.json();
}

export async function deletePost(id: string) {
  const response = await fetch(`${API_BASE}/api/posts/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete post');
}

export async function updatePostContent(id: string, content: string) {
  const response = await fetch(`${API_BASE}/api/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error('Failed to update post');
}

export async function updatePostSchedule(id: string, scheduled_time: string) {
  const response = await fetch(`${API_BASE}/api/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduled_time }),
  });
  if (!response.ok) throw new Error('Failed to update schedule');
}

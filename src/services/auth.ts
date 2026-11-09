import axios from 'axios';

export interface User {
  id: number;
  username: string;
}

const TOKEN_KEY = 'shopping_auth_token';
let generation = 0;

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthGeneration(): number {
  return generation;
}

export function invalidateAuthGeneration(): void {
  generation += 1;
}

export function saveToken(token: string): void {
  generation += 1;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  generation += 1;
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(username: string, password: string): Promise<User> {
  const { data } = await axios.post<{ token: string; user: User }>('/auth/login', { username, password });
  saveToken(data.token);
  return data.user;
}

export async function getCurrentUser(token: string): Promise<User> {
  const { data } = await axios.get<{ user: User }>('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  return data.user;
}
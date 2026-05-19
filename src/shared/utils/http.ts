export function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

export function okList<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number; totalPages: number },
): { success: true; data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } } {
  return { success: true, data, pagination };
}

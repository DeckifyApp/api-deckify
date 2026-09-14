export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function getPagination(input: PaginationInput): { skip: number; take: number; page: number; limit: number } {
  const pageInput = input.page;
  const limitInput = input.limit;
  const page = typeof pageInput === 'number' && Number.isSafeInteger(pageInput) && pageInput > 0 ? pageInput : 1;
  const limit =
    typeof limitInput === 'number' && Number.isSafeInteger(limitInput) && limitInput > 0
      ? Math.min(limitInput, 100)
      : 20;

  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

// D1 绑定的最小结构声明：只保留接口实际用到的成员，避免为类型引入 @cloudflare/workers-types

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T>(): Promise<{ results?: T[] }>;
  run(): Promise<{ meta: { last_row_id?: number } }>;
}

export interface D1Database {
  prepare(query: string): D1Statement;
}

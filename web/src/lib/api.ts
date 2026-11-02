// 画面が使うデータの窓口。本番は Java の API、デモはブラウザの中だけで動く。
import type { Judgement, Result } from "./judge.ts";

export type Category = "toner" | "emulsion" | "serum" | "cream" | "cleanser" | "sunscreen" | "base" | "other";

export const CATEGORY_LABEL: Record<Category, string> = {
  toner: "化粧水",
  emulsion: "乳液",
  serum: "美容液",
  cream: "クリーム",
  cleanser: "洗顔",
  sunscreen: "日焼け止め",
  base: "ベースメイク",
  other: "その他",
};

export interface Usage {
  id: number;
  startedOn: string;
  endedOn?: string;
  result?: Result;
  memo?: string;
}

export interface Product {
  id: number;
  name: string;
  brand?: string;
  category: Category;
  ingredients: string[];
  latestResult?: Result;
  usages: Usage[];
  createdAt: string;
}

export interface NewProduct {
  name: string;
  brand?: string;
  category: Category;
  ingredientsText: string;
}

export interface NewUsage {
  startedOn: string;
  endedOn?: string;
  result?: Result;
  memo?: string;
}

export interface JudgeResponse {
  candidate: string[];
  judgement: Judgement;
}

export interface Api {
  readonly demo: boolean;
  listProducts(): Promise<Product[]>;
  createProduct(p: NewProduct): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  addUsage(productId: number, u: NewUsage): Promise<Product>;
  judge(ingredientsText: string): Promise<JudgeResponse>;
  insights(): Promise<Judgement>;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Java の API を呼ぶ。トークンは Authorization ヘッダーで送る。 */
export class HttpApi implements Api {
  readonly demo = false;
  private readonly baseUrl: string;
  private readonly token: () => string | null;

  constructor(baseUrl: string, token: () => string | null) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = this.token();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error ?? "通信に失敗しました", res.status);
    return data as T;
  }

  listProducts = () => this.call<Product[]>("GET", "/api/products");
  createProduct = (p: NewProduct) => this.call<Product>("POST", "/api/products", p);
  deleteProduct = (id: number) => this.call<void>("DELETE", `/api/products/${id}`);
  addUsage = (id: number, u: NewUsage) => this.call<Product>("POST", `/api/products/${id}/usages`, u);
  judge = (ingredientsText: string) => this.call<JudgeResponse>("POST", "/api/judge", { ingredientsText });
  insights = () => this.call<Judgement>("GET", "/api/insights");

  register = (email: string, password: string) =>
    this.call<{ token: string }>("POST", "/api/auth/register", { email, password });
  login = (email: string, password: string) =>
    this.call<{ token: string }>("POST", "/api/auth/login", { email, password });
  logout = () => this.call<void>("POST", "/api/auth/logout");
}

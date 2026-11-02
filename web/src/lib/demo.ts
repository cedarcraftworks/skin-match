// デモ用：架空の利用者「さくら」さんの記録で、サーバーなしに動く。
// 商品名・ブランドはすべて架空。成分表示は一般的な化粧品によくある成分で作った例。
// 追加や削除はページを再読み込みすると元に戻る。
import type { Api, JudgeResponse, NewProduct, NewUsage, Product } from "./api.ts";
import { normalize } from "./ingredients.ts";
import { insights, judge, type Judgement, type UsageResult } from "./judge.ts";

interface Seed {
  name: string;
  brand: string;
  category: Product["category"];
  text: string;
  usage?: NewUsage;
}

const SEEDS: Seed[] = [
  {
    name: "しっとり化粧水",
    brand: "架空ブランドA",
    category: "toner",
    text: "水、グリセリン、BG、セラミドNP、ヒアルロン酸Na、ベタイン、フェノキシエタノール",
    usage: { startedOn: "2026-04-01", endedOn: "2026-06-30", result: "good", memo: "乾燥しにくくなった" },
  },
  {
    name: "やさしい乳液",
    brand: "架空ブランドB",
    category: "emulsion",
    text: "水、スクワラン、グリセリン、セラミドNP、BG、ベヘニルアルコール、カルボマー、フェノキシエタノール",
    usage: { startedOn: "2026-05-01", endedOn: "2026-07-31", result: "good" },
  },
  {
    name: "保湿クリーム",
    brand: "架空ブランドA",
    category: "cream",
    text: "水、グリセリン、シア脂、セラミドNP、セラミドAP、コレステロール、BG、フェノキシエタノール",
    usage: { startedOn: "2026-06-10", result: "good", memo: "夜だけ使用" },
  },
  {
    name: "アミノ酸洗顔フォーム",
    brand: "架空ブランドC",
    category: "cleanser",
    text: "水、グリセリン、ラウロイルメチルタウリンNa、ココイルグリシンK、BG、フェノキシエタノール",
    usage: { startedOn: "2026-03-15", result: "good" },
  },
  {
    name: "さっぱり化粧水",
    brand: "架空ブランドD",
    category: "toner",
    text: "精製水、エタノール、ブチレングリコール、メントール、香料、メチルパラベン",
    usage: { startedOn: "2026-02-01", endedOn: "2026-02-14", result: "bad", memo: "2週間で赤みが出た" },
  },
  {
    name: "ブライトニング美容液",
    brand: "架空ブランドE",
    category: "serum",
    text: "水、エタノール、DPG、アスコルビルグルコシド、香料、フェノキシエタノール",
    usage: { startedOn: "2026-07-20", endedOn: "2026-08-05", result: "bad", memo: "ピリピリした" },
  },
  {
    name: "UVミルク",
    brand: "架空ブランドF",
    category: "sunscreen",
    text: "水、エタノール、メトキシケイヒ酸エチルヘキシル、酸化亜鉛、BG、フェノキシエタノール",
    usage: { startedOn: "2026-10-15" },
  },
];

/** 判定画面で「例を入れる」に使う、架空の候補 */
export const DEMO_CANDIDATES = [
  {
    label: "例1：セラミド美容液",
    text: "水、グリセリン、BG、セラミドNP、ナイアシンアミド、フェノキシエタノール",
  },
  {
    label: "例2：ミスト化粧水",
    text: "精製水、エタノール、ヒアルロン酸ナトリウム、香料、BG",
  },
];

export class DemoApi implements Api {
  readonly demo = true;
  private products: Product[] = [];
  private nextId = 1;
  private nextUsageId = 1;

  constructor() {
    // 新しく登録した物ほど上に来るよう、古い順に作る
    for (const s of [...SEEDS].reverse()) {
      const p = this.make({ name: s.name, brand: s.brand, category: s.category, ingredientsText: s.text });
      if (s.usage) this.pushUsage(p, s.usage);
    }
  }

  private make(input: NewProduct): Product {
    const ingredients = normalize(input.ingredientsText);
    if (ingredients.length === 0) throw new Error("成分を読み取れませんでした");
    const p: Product = {
      id: this.nextId++,
      name: input.name.trim(),
      brand: input.brand?.trim() || undefined,
      category: input.category,
      ingredients,
      usages: [],
      createdAt: new Date(2026, 9, 1 + this.nextId).toISOString(),
    };
    this.products.unshift(p);
    return p;
  }

  private pushUsage(p: Product, u: NewUsage): void {
    if (u.endedOn && u.endedOn < u.startedOn) throw new Error("やめた日は使い始めた日より後にしてください");
    p.usages = [{ id: this.nextUsageId++, ...u }, ...p.usages].sort((a, b) =>
      b.startedOn.localeCompare(a.startedOn),
    );
    p.latestResult = p.usages.find((x) => x.result)?.result;
  }

  private records(): UsageResult[] {
    return this.products
      .filter((p) => p.latestResult)
      .map((p) => ({ result: p.latestResult!, ingredients: p.ingredients }));
  }

  private clone<T>(x: T): T {
    return structuredClone(x);
  }

  async listProducts(): Promise<Product[]> {
    return this.clone(this.products);
  }

  async createProduct(input: NewProduct): Promise<Product> {
    return this.clone(this.make(input));
  }

  async deleteProduct(id: number): Promise<void> {
    this.products = this.products.filter((p) => p.id !== id);
  }

  async addUsage(productId: number, u: NewUsage): Promise<Product> {
    const p = this.products.find((x) => x.id === productId);
    if (!p) throw new Error("化粧品が見つかりません");
    this.pushUsage(p, u);
    return this.clone(p);
  }

  async judge(ingredientsText: string): Promise<JudgeResponse> {
    const candidate = normalize(ingredientsText);
    if (candidate.length === 0) throw new Error("成分を読み取れませんでした");
    return { candidate, judgement: judge(candidate, this.records()) };
  }

  async insights(): Promise<Judgement> {
    return insights(this.records());
  }
}

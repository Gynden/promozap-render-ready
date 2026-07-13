interface CategoryRule {
  keywords: string[];
  emoji: string;
  hashtag: string;
}

const RULES: CategoryRule[] = [
  { keywords: ["tv", "televisao", "televisão", "smart tv"], emoji: "📺", hashtag: "TV E ELETRÔNICOS" },
  { keywords: ["celular", "smartphone", "iphone", "galaxy", "xiaomi"], emoji: "📱", hashtag: "CELULARES" },
  { keywords: ["notebook", "laptop", "macbook"], emoji: "💻", hashtag: "INFORMÁTICA" },
  { keywords: ["fone", "headset", "airpods", "headphone"], emoji: "🎧", hashtag: "ÁUDIO" },
  { keywords: ["geladeira", "fogão", "microondas", "micro-ondas", "lava", "eletrodomest"], emoji: "🧊", hashtag: "ELETRODOMÉSTICOS" },
  { keywords: ["cadeira", "mesa", "sofa", "sofá", "moveis", "móveis"], emoji: "🛋️", hashtag: "CASA E MÓVEIS" },
  { keywords: ["tenis", "tênis", "sapato", "roupa", "camisa", "moda"], emoji: "👟", hashtag: "MODA" },
  { keywords: ["brinquedo", "boneca", "lego"], emoji: "🧸", hashtag: "BRINQUEDOS" },
  { keywords: ["perfume", "beleza", "maquiagem", "skincare"], emoji: "💄", hashtag: "BELEZA" },
  { keywords: ["livro"], emoji: "📚", hashtag: "LIVROS" },
  { keywords: ["ferramenta", "furadeira", "parafusadeira"], emoji: "🛠️", hashtag: "FERRAMENTAS" },
];

export function detectCategoryStyle(title: string, category: string | null) {
  const haystack = `${title} ${category ?? ""}`.toLowerCase();
  const match = RULES.find((rule) => rule.keywords.some((kw) => haystack.includes(kw)));
  return match ?? { emoji: "🛍️", hashtag: "OFERTAS" };
}

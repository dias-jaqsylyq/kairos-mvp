// Without aliases, a user who types "react" misses every listing that says
// "React.js" or "Next.js". This map is the cheapest quality win available.
export const ALIASES: Record<string, string[]> = {
  react: ["react.js", "reactjs", "next.js", "nextjs"],
  javascript: ["js", "typescript", "ts", "node", "node.js"],
  python: ["py", "django", "flask", "fastapi"],
  ml: ["machine learning", "deep learning", "pytorch", "tensorflow"],
  ai: ["artificial intelligence", "llm", "genai", "generative ai"],
  design: ["ui", "ux", "figma", "product design"],
  mobile: ["ios", "android", "react native", "flutter", "swift", "kotlin"],
  web3: ["blockchain", "solidity", "ethereum", "crypto"],
  data: ["data science", "analytics", "sql", "pandas"],
  cloud: ["aws", "gcp", "azure", "kubernetes", "docker"],
};

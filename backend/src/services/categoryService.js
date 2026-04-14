const CATEGORIES = {
  'AI': ['ai', 'machine learning', 'deep learning', 'llm', 'gpt',
    'chatgpt', 'claude', 'gemini', 'tensorflow', 'pytorch',
    'neural network', 'nlp', 'computer vision'],
  'Languages': ['python', 'javascript', 'typescript', 'rust', 'golang', 'java',
    'kotlin', 'swift', 'php', 'ruby', 'scala', 'cpp', 'c++'],
  'DevOps': ['docker', 'kubernetes', 'aws', 'azure', 'gcp',
    'terraform', 'devops', 'ci/cd', 'linux',
    'microservices', 'serverless', 'edge computing'],
  'Database': [ 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
    'sqlite', 'supabase', 'prisma'],
  'Frontend': ['react', 'vue', 'angular', 'nextjs', 'svelte',
    'webassembly', 'wasm'],
};

function getCategory(keywords) {
  for (const [category, words] of Object.entries(CATEGORIES)) {
    if (keywords.some(kw => words.includes(kw))) return category;
  }
  return 'Other';
}

module.exports = { getCategory };
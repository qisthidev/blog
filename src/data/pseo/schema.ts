export interface CodeExample {
  before: string;
  after: string;
  language: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface ErrorGuide {
  error_message: string;
  framework: string;
  slug: string;
  root_cause: string;
  symptoms: string[];
  fix_steps: string[];
  example_code: CodeExample;
  related_topics: string[];
  faqs: FAQ[];
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface CommandExplainer {
  command: string;
  tool: string;
  slug: string;
  explanation: string;
  syntax: string;
  flags: { flag: string; description: string; example: string }[];
  examples: { description: string; code: string }[];
  common_mistakes: { mistake: string; fix: string }[];
  related_commands: string[];
  faqs: FAQ[];
}

export interface PerformanceGuide {
  technology: string;
  topic: string;
  slug: string;
  explanation: string;
  problem_scenario: string;
  solution_code: CodeExample;
  performance_impact: string;
  metrics: { metric: string; before: string; after: string }[];
  related_articles: string[];
  faqs: FAQ[];
}

export interface PSEODataset<T> {
  model: "errors" | "commands" | "performance";
  hub: string;
  hub_title: string;
  hub_description: string;
  hub_tags: string[];
  entries: T[];
}

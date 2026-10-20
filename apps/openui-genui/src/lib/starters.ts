export type Starter = {
  id: "planets" | "laptops" | "dashboard" | "signup" | "interest" | "weather";
  displayText: string;
  prompt: string;
};

/** Welcome-screen prompts. Each one is aimed at a different component family. */
export const STARTERS: Starter[] = [
  {
    id: "planets",
    displayText: "Compare 3 planets",
    prompt: "Show a table of 3 planets with mass and moons",
  },
  {
    id: "laptops",
    displayText: "Compare 3 laptops",
    prompt:
      "Compare 3 laptops for a developer: a lightweight ultrabook, a creator laptop, and a budget machine.",
  },
  {
    id: "dashboard",
    displayText: "Sales dashboard",
    prompt: "Show a sales dashboard for the last 6 months with a bar chart and a short summary.",
  },
  {
    id: "signup",
    displayText: "Signup form",
    prompt: "Build me a signup form with name, email, and a plan selector.",
  },
  {
    id: "interest",
    displayText: "Compound interest",
    prompt: "Explain how compound interest works using $10,000 invested at 7% for 10 years, with a chart.",
  },
  {
    id: "weather",
    displayText: "Weather in Berlin",
    prompt: "What's the weather in Berlin right now?",
  },
];

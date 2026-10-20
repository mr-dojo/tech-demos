import { STARTERS, type Starter } from "@/lib/starters";
import type { WeatherResult } from "@/lib/tools";

/** Quote a string for an OpenUI Lang literal. */
export function openuiString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`;
}

const PLANETS = `root = Stack([heading, table])
heading = CardHeader("Three planets", "Mass relative to Earth, and known moons")
table = Table([planet, mass, moons])
planet = Col("Planet", ["Mercury", "Earth", "Jupiter"], "string")
mass = Col("Mass (Earth = 1)", [0.055, 1, 317.8], "number")
moons = Col("Moons", [0, 1, 95], "number")
`;

const LAPTOPS = `root = Stack([heading, grid])
heading = CardHeader("Three laptops", "One for the bag, one for the desk, one for the budget")
grid = Stack([aero, canvas, commute], "row", "m", "stretch", "start", true)
aero = Card([aeroHead, aeroBody, aeroTags])
aeroHead = CardHeader("Aero 13", "Lightweight ultrabook")
aeroBody = TextContent("1.2 kg, 13-inch, all-day battery. The one you actually carry.")
aeroTags = TagBlock(["1.2 kg", "13 in", "Fanless"])
canvas = Card([canvasHead, canvasBody, canvasTags])
canvasHead = CardHeader("Canvas 16", "Creator laptop")
canvasBody = TextContent("16-inch color-accurate screen and a GPU for local builds and edits.")
canvasTags = TagBlock(["16 in", "32 GB", "Dedicated GPU"])
commute = Card([commuteHead, commuteBody, commuteTags])
commuteHead = CardHeader("Field 15", "Budget machine")
commuteBody = TextContent("A 15-inch workhorse with room for a second drive. Half the price of Canvas.")
commuteTags = TagBlock(["15 in", "16 GB", "Upgradeable"])
`;

const DASHBOARD = `root = Stack([heading, summary, chart])
heading = CardHeader("Sales, last 6 months", "Revenue in thousands of USD")
summary = Callout("info", "Up 22% since January", "June is the strongest month, led by the Pro plan.")
chart = BarChart(labels, [series], "grouped", "Month", "Revenue ($k)", 260)
labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
series = Series("Revenue", [42, 48, 45, 61, 70, 86])
`;

const SIGNUP = `root = Stack([heading, form])
heading = CardHeader("Create your account", "Name, email, and a plan")
form = Form("signup", actions, [nameField, emailField, planField])
nameField = FormControl("Name", Input("name", "Ada Lovelace", "text", {required: true}))
emailField = FormControl("Email", Input("email", "ada@example.com", "email", {required: true, email: true}))
planField = FormControl("Plan", Select("plan", [starter, pro], "Choose a plan", {required: true}))
starter = SelectItem("starter", "Starter")
pro = SelectItem("pro", "Pro")
actions = Buttons([submitBtn])
submitBtn = Button("Create account", @ToAssistant("Sign me up with this form"), "primary")
`;

const INTEREST = `root = Stack([heading, steps, chart, note])
heading = CardHeader("Compound interest", "$10,000 at 7% for 10 years")
steps = Steps([stepStart, stepYear, stepEnd])
stepStart = StepsItem("Start", "You invest $10,000 once and leave it alone.")
stepYear = StepsItem("Each year", "The balance grows by 7%, and that growth earns interest too.")
stepEnd = StepsItem("After 10 years", "The balance is about $19,672 — nearly double.")
chart = LineChart(years, [balance], "natural", "Year", "Balance ($)", 260)
years = ["0", "2", "4", "6", "8", "10"]
balance = Series("Balance", [10000, 11449, 13108, 15007, 17182, 19672])
note = TextContent("Taxes and fees are left out. The curve bends upward because each year's interest earns interest.", "small")
`;

const PROGRAMS: Record<Exclude<Starter["id"], "weather">, string> = {
  planets: PLANETS,
  laptops: LAPTOPS,
  dashboard: DASHBOARD,
  signup: SIGNUP,
  interest: INTEREST,
};

export function fallbackProgram(): string {
  return `root = Stack([heading, body])
heading = CardHeader("Demo mode", "This reply was not sent to a model")
body = Callout("neutral", "Try a starter", "Planets render a table, the sales dashboard a chart, and signup a form. Set OPENAI_API_KEY for any other question.")
`;
}

export function weatherProgram(result: WeatherResult): string {
  if ("error" in result) {
    const message = openuiString(result.error);
    return `root = Stack([heading, notice])
heading = CardHeader("Weather", "Open-Meteo")
notice = Callout("warning", "Lookup failed", ${message})
`;
  }
  const place = openuiString(result.place);
  const summary = openuiString(
    `${result.temperature_c}°C and ${result.conditions}. Wind ${result.wind_kmh} km/h.`,
  );
  return `root = Stack([card])
card = Card([header, summary, chart])
header = CardHeader(${place}, "Live from Open-Meteo")
summary = TextContent(${summary}, "large")
chart = BarChart(labels, [series], "grouped", "", "", 220)
labels = ["Temperature (°C)", "Wind (km/h)"]
series = Series("Now", [${result.temperature_c}, ${result.wind_kmh}])
`;
}

export function extractLocation(prompt: string): string {
  const match = prompt.match(/\b(?:in|for|at)\s+([A-Za-z][A-Za-z .'-]{0,60})/i);
  if (!match?.[1]) return "";
  return match[1]
    .replace(/\b(right now|today|please|currently|tonight)\b/gi, "")
    .replace(/[?.!].*$/, "")
    .trim();
}

export type DemoMatch = { kind: "program"; source: string } | { kind: "weather"; location: string };

/** Pick a canned program for a starter prompt, or a weather lookup. */
export function matchDemo(prompt: string): DemoMatch {
  const normalized = prompt.trim().toLowerCase();
  for (const starter of STARTERS) {
    if (starter.prompt.trim().toLowerCase() === normalized) {
      if (starter.id === "weather") {
        return { kind: "weather", location: extractLocation(starter.prompt) || "Berlin" };
      }
      return { kind: "program", source: PROGRAMS[starter.id] };
    }
  }
  if (/\b(weather|temperature|forecast)\b/.test(normalized)) {
    return { kind: "weather", location: extractLocation(prompt) };
  }
  if (/\bplanet/.test(normalized)) return { kind: "program", source: PROGRAMS.planets };
  if (/\blaptop/.test(normalized)) return { kind: "program", source: PROGRAMS.laptops };
  if (/\b(sales|dashboard|revenue)\b/.test(normalized)) {
    return { kind: "program", source: PROGRAMS.dashboard };
  }
  if (/\b(signup|sign up|sign-up|register)\b/.test(normalized)) {
    return { kind: "program", source: PROGRAMS.signup };
  }
  if (/\b(compound interest|invested|investment)\b/.test(normalized)) {
    return { kind: "program", source: PROGRAMS.interest };
  }
  return { kind: "program", source: fallbackProgram() };
}

export const DEMO_PROGRAMS = PROGRAMS;

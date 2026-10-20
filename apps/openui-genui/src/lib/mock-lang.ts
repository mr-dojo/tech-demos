import { GAMING_BUILD, GAMING_PICKUP_SKUS, GPU_COMPARE_SKUS, MONITOR_WARRANTY, PICKUP_STORE_ID, RETURN_ITEM } from "@/lib/builds";
import { formatMoney, getPart, stockLabel } from "@/lib/catalog";
import { STARTERS, type Starter } from "@/lib/starters";
import { checkStoreStock, formatLongDate, formatMonthYear, orderHistory, ownedPart, placePickupOrder, quoteWarrantyExtension, startSupportRequest } from "@/lib/shopper";
import { SLOT_LABEL, checkCompatibility, priceBuild, type CheckStatus } from "@/lib/tools";

/** Quote a string for an OpenUI Lang literal. */
export function openuiString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`;
}

function col(id: string, label: string, values: Array<string | number>): string {
  const cells = values.map((value) => (typeof value === "number" ? String(value) : openuiString(value))).join(", ");
  const type = values.every((value) => typeof value === "number") ? "number" : "string";
  return `${id} = Col(${openuiString(label)}, [${cells}], ${openuiString(type)})`;
}

function callout(id: string, variant: "info" | "warning" | "error" | "success" | "neutral", title: string, description: string): string {
  return `${id} = Callout(${openuiString(variant)}, ${openuiString(title)}, ${openuiString(description)})`;
}

const CALLOUT_VARIANT: Record<Exclude<CheckStatus, "skip">, "success" | "warning" | "error"> = {
  pass: "success",
  warn: "warning",
  fail: "error",
};

export function gamingProgram(): string {
  const priced = priceBuild(GAMING_BUILD);
  const compat = checkCompatibility(GAMING_BUILD);
  const ownedGpu = ownedPart("VL-GPU-1070");
  const lines = [
    "root = Stack([intro, ownedNote, table, total, compatHead, socket, ram, psu, gpuFit, coolerFit, formHead, form, actions])",
    `intro = CardHeader("A $1,500 1440p gaming PC", "Voltline sample build. Pickup is the default.")`,
    callout(
      "ownedNote",
      "warning",
      "Replacing your GTX 1070",
      ownedGpu
        ? `You own a GeForce GTX 1070 — purchased Nov 2018. It is left out of this build. Say if you want to replace the case, PSU, RAM, or SSD too.`
        : "The old GPU is left out of this build.",
    ),
    "table = Table([part, model, price, stock, notes])",
    col(
      "part",
      "Part",
      priced.lines.map((line) => SLOT_LABEL[line.slot]),
    ),
    col(
      "model",
      "Model",
      priced.lines.map((line) => line.name),
    ),
    col(
      "price",
      "Price",
      priced.lines.map((line) => (line.countedInTotal ? formatMoney(line.price) : "Owned")),
    ),
    col(
      "stock",
      "Stock",
      priced.lines.map((line) => (line.owned ? "In your rig" : stockLabel(line.stock))),
    ),
    col(
      "notes",
      "Notes",
      priced.lines.map((line) => line.note),
    ),
    callout(
      "total",
      "success",
      `${formatMoney(priced.total)} due of ${formatMoney(priced.budget ?? 0)}`,
      `${formatMoney(priced.ownedValue)} in parts you already own is left out of the total. ${formatMoney(priced.remaining ?? 0)} is still open.`,
    ),
    `compatHead = CardHeader("Compatibility", "Socket, memory, power, and fit from the sample catalog")`,
  ];
  const compatIds = [
    ["socket", "socket"],
    ["ram", "ram"],
    ["psu", "psu"],
    ["gpu_length", "gpuFit"],
    ["cooler_height", "coolerFit"],
  ] as const;
  for (const [checkId, nodeId] of compatIds) {
    const item = compat.checks.find((entry) => entry.id === checkId);
    if (!item || item.status === "skip") {
      lines.push(callout(nodeId, "neutral", "Not checked", "Add the matching parts to run this check."));
    } else {
      lines.push(callout(nodeId, CALLOUT_VARIANT[item.status], item.title, item.detail));
    }
  }
  lines.push(
    `formHead = CardHeader("Refine the build", "Budget, use case, resolution, size, and brand come back as the next message")`,
    `form = Form("refine", refineActions, [budgetField, useField, resField, sizeField, brandField])`,
    `budgetField = FormControl("Budget", Slider("budget", "continuous", 500, 4000, 50, [1500]), "USD, before tax")`,
    `useField = FormControl("Use case", Select("use", [useGame, useEdit, useQuiet], "What is the PC for?"))`,
    `useGame = SelectItem("gaming", "1440p gaming")`,
    `useEdit = SelectItem("editing", "Video editing")`,
    `useQuiet = SelectItem("quiet", "Quiet workstation")`,
    `resField = FormControl("Resolution", Select("resolution", [res1080, res1440, res4k], "Target resolution"))`,
    `res1080 = SelectItem("1080p", "1080p")`,
    `res1440 = SelectItem("1440p", "1440p")`,
    `res4k = SelectItem("4k", "4K")`,
    `sizeField = FormControl("Form factor", Select("size", [sizeAtx, sizeMatx, sizeItx], "Case size"))`,
    `sizeAtx = SelectItem("ATX", "ATX mid tower")`,
    `sizeMatx = SelectItem("mATX", "Compact mATX")`,
    `sizeItx = SelectItem("ITX", "Small form factor")`,
    `brandField = FormControl("Brand preference", Select("brand", [brandAny, brandAmd, brandIntel, brandNvidia], "Optional"))`,
    `brandAny = SelectItem("any", "No preference")`,
    `brandAmd = SelectItem("amd", "AMD")`,
    `brandIntel = SelectItem("intel", "Intel")`,
    `brandNvidia = SelectItem("nvidia", "NVIDIA")`,
    `refineActions = Buttons([refineBtn])`,
    `refineBtn = Button("Update the build", @ToAssistant("Refine my Voltline build with this form"), "secondary")`,
    `actions = Buttons([pickupBtn, shipBtn])`,
    `pickupBtn = Button("Reserve for in-store pickup", @ToAssistant("Reserve the $1,500 gaming build for in-store pickup"), "primary")`,
    `shipBtn = Button("Ship instead", @ToAssistant("Ship the $1,500 gaming build instead of pickup"), "secondary")`,
  );
  return `${lines.join("\n")}\n`;
}

export function upgradeProgram(): string {
  const cards = GPU_COMPARE_SKUS.map((sku) => getPart(sku)).filter((part) => part !== undefined);
  const lines = [
    "root = Stack([heading, note, chart, table])",
    `heading = CardHeader("Three cards to replace a GTX 1070", "Estimated 1440p FPS from the sample catalog")`,
    callout(
      "note",
      "info",
      "You own a GeForce GTX 1070 — purchased Nov 2018",
      "These three are new cards. None of them are added to a cart until you reserve pickup.",
    ),
    `chart = BarChart(labels, [fps], "grouped", "Card", "1440p FPS", 260)`,
    `labels = [${cards.map((card) => openuiString(card.name.replace("GeForce ", "").replace("Radeon ", ""))).join(", ")}]`,
    `fps = Series("1440p FPS", [${cards.map((card) => card.fps1440p ?? 0).join(", ")}])`,
    "table = Table([card, price, fpsCol, draw])",
    col(
      "card",
      "Card",
      cards.map((card) => card.name),
    ),
    col(
      "price",
      "Price",
      cards.map((card) => formatMoney(card.price)),
    ),
    col(
      "fpsCol",
      "1440p FPS",
      cards.map((card) => card.fps1440p ?? 0),
    ),
    col(
      "draw",
      "Board power",
      cards.map((card) => `${card.tdpWatts ?? 0}W`),
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function warrantyLabel(order: ReturnType<typeof orderHistory>[number]): string {
  const urgent = [...order.items].sort((left, right) => rankWarranty(left.warranty) - rankWarranty(right.warranty))[0];
  if (!urgent) return "None";
  if (urgent.warranty === "expired") return "Expired";
  if (urgent.warranty === "expiring_soon" && urgent.warrantyExpiresOn) {
    return `Expires ${formatLongDate(urgent.warrantyExpiresOn)}`;
  }
  if (urgent.warranty === "active") return "Active";
  return "None";
}

function rankWarranty(state: string): number {
  if (state === "expiring_soon") return 0;
  if (state === "expired") return 1;
  if (state === "active") return 2;
  return 3;
}

export function ordersProgram(): string {
  const orders = orderHistory();
  const lines = [
    "root = Stack([heading, table, hint, actions])",
    `heading = CardHeader("Alex Rivera", "Sample orders through Oct 20, 2026")`,
    "table = Table([order, placed, items, how, warranty])",
    col(
      "order",
      "Order",
      orders.map((order) => order.id),
    ),
    col(
      "placed",
      "Date",
      orders.map((order) => formatMonthYear(order.date)),
    ),
    col(
      "items",
      "Items",
      orders.map((order) =>
        order.items.length === 1 ? order.items[0]!.name : `${order.items[0]!.name} +${order.items.length - 1}`,
      ),
    ),
    col(
      "how",
      "How",
      orders.map((order) => (order.fulfillment === "pickup" ? "Pickup" : "Shipped")),
    ),
    col(
      "warranty",
      "Warranty",
      orders.map((order) => warrantyLabel(order)),
    ),
    callout(
      "hint",
      "warning",
      "Kiln View 27 protection expires Nov 5, 2026",
      "That plan can still be extended. The Drift Cue Headset plan is already expired.",
    ),
    `actions = Buttons([warrantyBtn, returnBtn])`,
    `warrantyBtn = Button("Extend monitor warranty", @ToAssistant("My monitor protection plan is expiring. Show extension options."), "primary")`,
    `returnBtn = Button("Help with the keyboard", @ToAssistant("Help me with a return for the keyboard on my latest order."), "secondary")`,
  ];
  return `${lines.join("\n")}\n`;
}

export function warrantyProgram(): string {
  const quote = quoteWarrantyExtension(MONITOR_WARRANTY.orderId, MONITOR_WARRANTY.sku);
  if (!("extendable" in quote) || !quote.extendable) {
    return fallbackProgram();
  }
  const lines = [
    "root = Stack([heading, notice, plans, action])",
    `heading = CardHeader("Extend protection", ${openuiString(quote.name)})`,
    callout(
      "notice",
      "warning",
      `Your protection plan on ${quote.name} expires ${formatLongDate(quote.expiresOn)}`,
      "Sample prices. Extending does not charge a card in this demo.",
    ),
    "plans = Table([plan, price])",
    col(
      "plan",
      "Plan",
      quote.plans.map((plan) => plan.label),
    ),
    col(
      "price",
      "Price",
      quote.plans.map((plan) => formatMoney(plan.price)),
    ),
    `action = Buttons([extendBtn])`,
    `extendBtn = Button("Extend warranty", @ToAssistant("Extend the Kiln View 27 protection plan by 2 years"), "primary")`,
  ];
  return `${lines.join("\n")}\n`;
}

export function supportProgram(): string {
  const opened = startSupportRequest(RETURN_ITEM);
  const caseId = "caseId" in opened ? opened.caseId : "VL-RMA-2140";
  const lines = [
    "root = Stack([heading, context, form, confirm])",
    `heading = CardHeader("Help with this item", "Drift Key TKL · order VL-ORD-2140")`,
    callout(
      "context",
      "info",
      "Return window is open",
      "Purchased Oct 2, 2026 and shipped. The form is prefilled from that order. Sample only.",
    ),
    `form = Form("support", actions, [issueField, detailsField, resolutionField])`,
    `issueField = FormControl("Issue", Select("issue", [defect, wrong, changed], "Defect or DOA"))`,
    `defect = SelectItem("defect", "Defect or DOA")`,
    `wrong = SelectItem("wrong", "Wrong item")`,
    `changed = SelectItem("changed", "Changed my mind")`,
    `detailsField = FormControl("What happened", TextArea("details", "The right shift key does not register.", 3))`,
    `resolutionField = FormControl("Preferred resolution", Select("resolution", [ret, exchange, repair], "Return"))`,
    `ret = SelectItem("return", "Return")`,
    `exchange = SelectItem("exchange", "Exchange")`,
    `repair = SelectItem("repair", "Repair")`,
    `actions = Buttons([submitBtn])`,
    `submitBtn = Button("Submit request", @ToAssistant("Submit the keyboard return form"), "primary")`,
    callout(
      "confirm",
      "success",
      `Case ${caseId}`,
      "Return requested for the Drift Key TKL. This is a sample RMA. Nothing is shipped back.",
    ),
  ];
  return `${lines.join("\n")}\n`;
}

export function pickupProgram(): string {
  const stock = checkStoreStock([...GAMING_PICKUP_SKUS]);
  const reserved = placePickupOrder({ storeId: PICKUP_STORE_ID, skus: [...GAMING_PICKUP_SKUS] });
  const lines = "lines" in stock ? stock.lines : [];
  const confirmation =
    reserved.ok
      ? callout(
          "confirm",
          "success",
          `Reserved · code ${reserved.code}`,
          `${reserved.storeName}, ${reserved.address}. Ready by ${reserved.readyBy} (${reserved.window}). ${formatMoney(reserved.total)} due at the counter. Sample reservation, not a charge.`,
        )
      : callout("confirm", "error", "Could not reserve", reserved.error);
  return `${[
    "root = Stack([heading, stock, picker, confirm])",
    `heading = CardHeader("Reserve for in-store pickup", "The four parts this build still needs. Owned parts stay home.")`,
    "stock = Table([store, status, when])",
    col(
      "store",
      "Store",
      lines.map((line) => line.storeName),
    ),
    col(
      "status",
      "Build stock",
      lines.map((line) => (line.inStock ? "In stock" : `Missing ${line.missing.map((item) => item.name).join(", ")}`)),
    ),
    col(
      "when",
      "Ready",
      lines.map((line) => (line.inStock ? line.readyBy : "—")),
    ),
    `picker = Form("pickup", pickActions, [storeField, windowField])`,
    `storeField = FormControl("Store", Select("store", [harbor, keel, north, draft], "Voltline Harbor"))`,
    `harbor = SelectItem("store-harbor", "Voltline Harbor")`,
    `keel = SelectItem("store-keel", "Voltline Keel Yard")`,
    `north = SelectItem("store-northspan", "Voltline Northspan")`,
    `draft = SelectItem("store-draft", "Voltline Draft")`,
    `windowField = FormControl("Pickup window", Select("window", [soon, later], "Today 5–7 PM"))`,
    `soon = SelectItem("today", "Today 5–7 PM")`,
    `later = SelectItem("tomorrow", "Tomorrow 10 AM–12 PM")`,
    `pickActions = Buttons([reserveBtn])`,
    `reserveBtn = Button("Reserve at this store", @ToAssistant("Reserve the gaming build for pickup at the store I picked"), "primary")`,
    confirmation,
  ].join("\n")}\n`;
}

export function fallbackProgram(): string {
  return `root = Stack([heading, body])
heading = CardHeader("Voltline demo mode", "This reply was not sent to a model")
body = Callout("neutral", "Try a starter", "The gaming build reuses parts you own, orders and warranties use the sample shopper, and pickup reserves a store. Set OPENAI_API_KEY for any other question.")
`;
}

const PROGRAMS: Record<Starter["id"], () => string> = {
  gaming: gamingProgram,
  upgrade: upgradeProgram,
  orders: ordersProgram,
  warranty: warrantyProgram,
  support: supportProgram,
  pickup: pickupProgram,
};

export function programFor(id: Starter["id"]): string {
  return PROGRAMS[id]();
}

export type DemoMatch = { kind: "program"; source: string };

/** Pick a canned program for a starter or a close paraphrase. */
export function matchDemo(prompt: string): DemoMatch {
  const normalized = prompt.trim().toLowerCase();
  for (const starter of STARTERS) {
    if (starter.prompt.trim().toLowerCase() === normalized) {
      return { kind: "program", source: programFor(starter.id) };
    }
  }
  if (/\b(order history|my orders|past orders)\b/.test(normalized)) {
    return { kind: "program", source: ordersProgram() };
  }
  if (/\b(warranty|protection plan|extend)\b/.test(normalized)) {
    return { kind: "program", source: warrantyProgram() };
  }
  if (/\b(return|rma|help with)\b/.test(normalized)) {
    return { kind: "program", source: supportProgram() };
  }
  if (/\b(pickup|reserve|in-store|in store)\b/.test(normalized)) {
    return { kind: "program", source: pickupProgram() };
  }
  if (/\b(gtx 1070|gpu option|compare)\b/.test(normalized)) {
    return { kind: "program", source: upgradeProgram() };
  }
  if (/\b(gaming|1440p|build me|workstation|video editing)\b/.test(normalized)) {
    return { kind: "program", source: gamingProgram() };
  }
  return { kind: "program", source: fallbackProgram() };
}

import { GAMING_BUILD, GAMING_PICKUP_SKUS, GPU_COMPARE_SKUS, MONITOR_WARRANTY, PICKUP_STORE_ID, RETURN_ITEM } from "@/lib/builds";
import { formatMoney, getPart, stockLabel, type Part } from "@/lib/catalog";
import { STARTERS, type Starter } from "@/lib/starters";
import {
  checkStoreStock,
  formatLongDate,
  orderHistory,
  ownedPart,
  placePickupOrder,
  quoteWarrantyExtension,
  startSupportRequest,
  type OrderRecord,
} from "@/lib/shopper";
import { SLOT_LABEL, checkCompatibility, estimateWattage, priceBuild, type CheckStatus } from "@/lib/tools";

/** Quote a string for an OpenUI Lang literal. */
export function openuiString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`;
}

function col(id: string, label: string, values: Array<string | number>): string {
  const cells = values.map((value) => (typeof value === "number" ? String(value) : openuiString(value))).join(", ");
  const type = values.every((value) => typeof value === "number") ? "number" : "string";
  return `${id} = Col(${openuiString(label)}, [${cells}], ${openuiString(type)})`;
}

function callout(
  id: string,
  variant: "info" | "warning" | "error" | "success" | "neutral",
  title: string,
  description: string,
): string {
  return `${id} = Callout(${openuiString(variant)}, ${openuiString(title)}, ${openuiString(description)})`;
}

function slug(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "");
}

function stringList(values: string[]): string {
  return `[${values.map((value) => openuiString(value)).join(", ")}]`;
}

/** Stable sample rating so cards can show one without a catalog field. */
function sampleRating(sku: string): string {
  let hash = 0;
  for (const char of sku) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  const tenths = 40 + (hash % 11);
  return `${(tenths / 10).toFixed(1)} sample rating`;
}

function specChips(part: Part): string[] {
  const chips: string[] = [];
  if (part.socket) chips.push(part.socket);
  if (part.chipset) chips.push(part.chipset);
  if (part.ramType) chips.push(part.ramType);
  if (part.capacityGb) chips.push(part.capacityGb >= 1000 ? `${part.capacityGb / 1000} TB` : `${part.capacityGb} GB`);
  if (part.formFactor) chips.push(part.formFactor);
  if (part.tdpWatts) chips.push(`${part.tdpWatts}W`);
  if (part.wattage) chips.push(`${part.wattage}W`);
  if (part.lengthMm) chips.push(`${part.lengthMm} mm`);
  if (part.coolerHeightMm) chips.push(`${part.coolerHeightMm} mm tall`);
  if (part.fps1440p) chips.push(`${part.fps1440p} FPS`);
  if (chips.length === 0) chips.push(part.category);
  return chips.slice(0, 3);
}

function miles(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} mi`;
}

function storeAvailability(sku: string): string {
  const stock = checkStoreStock([sku]);
  if (!("lines" in stock)) return "Store check unavailable";
  const harbor = stock.lines.find((line) => line.storeId === PICKUP_STORE_ID);
  if (harbor?.inStock) return `Harbor · ${miles(harbor.distanceMiles)} · in stock`;
  const nearest = stock.lines.find((line) => line.inStock);
  if (!nearest) return "Out at nearby stores";
  return `${nearest.storeName.replace("Voltline ", "")} · ${miles(nearest.distanceMiles)} · in stock`;
}

type CardAction = { label: string; prompt: string; variant?: "primary" | "secondary" };

/**
 * Cards use flex: 1 and min-width 0, so a wrapping row collapses to one line.
 * Fixed-size rows keep a real grid.
 */
function rowStacks(lines: string[], ids: string[], prefix: string, size: number): string[] {
  const rowIds: string[] = [];
  for (let index = 0; index < ids.length; index += size) {
    const rowId = `${prefix}${rowIds.length + 1}`;
    lines.push(`${rowId} = Stack([${ids.slice(index, index + size).join(", ")}], "row", "m", "stretch", "start")`);
    rowIds.push(rowId);
  }
  return rowIds;
}

function addProductCard(
  lines: string[],
  options: {
    id: string;
    part: Part;
    subtitle: string;
    priceLabel?: string;
    badges: string[];
    ownedPhrase?: string;
    primary: CardAction;
    secondary?: CardAction;
  },
): string {
  const id = options.id;
  const children = [`${id}Img`, `${id}Head`, `${id}Specs`, `${id}Price`, `${id}Badges`];
  lines.push(
    `${id}Img = ImageBlock("/parts/${options.part.category}.svg", ${openuiString(`${options.part.name} illustration`)})`,
    `${id}Head = CardHeader(${openuiString(options.part.name)}, ${openuiString(options.subtitle)})`,
    `${id}Specs = TagBlock(${stringList(specChips(options.part))}, "sm")`,
    `${id}Price = TextContent(${openuiString(options.priceLabel ?? formatMoney(options.part.price))}, "large-heavy")`,
    `${id}Badges = TagBlock(${stringList(options.badges)}, "sm")`,
  );
  if (options.ownedPhrase) {
    children.push(`${id}Owned`);
    lines.push(callout(`${id}Owned`, "success", "You own this", options.ownedPhrase));
  }
  const buttons = [`${id}Primary`];
  const primary = options.primary;
  lines.push(
    `${id}Primary = Button(${openuiString(primary.label)}, @ToAssistant(${openuiString(primary.prompt)}), ${openuiString(primary.variant ?? "primary")}, "normal", "small")`,
  );
  if (options.secondary) {
    buttons.push(`${id}Secondary`);
    const secondary = options.secondary;
    lines.push(
      `${id}Secondary = Button(${openuiString(secondary.label)}, @ToAssistant(${openuiString(secondary.prompt)}), ${openuiString(secondary.variant ?? "secondary")}, "normal", "small")`,
    );
  }
  children.push(`${id}Actions`);
  lines.push(`${id}Actions = Buttons([${buttons.join(", ")}])`, `${id} = Card([${children.join(", ")}], "card", "column", "s")`);
  return id;
}

const CALLOUT_VARIANT: Record<Exclude<CheckStatus, "skip">, "success" | "warning" | "error"> = {
  pass: "success",
  warn: "warning",
  fail: "error",
};

const PICKUP_PROMPT = "Reserve the $1,500 gaming build for in-store pickup";

export function gamingProgram(): string {
  const priced = priceBuild(GAMING_BUILD);
  const compat = checkCompatibility(GAMING_BUILD);
  const draw = estimateWattage(GAMING_BUILD);
  const ownedGpu = ownedPart("VL-GPU-1070");
  const psu = getPart(GAMING_BUILD.psu ?? "");
  const headroom = (psu?.wattage ?? 0) - draw.watts;
  const due = priced.total;
  const stillOpen = Math.max(priced.remaining ?? 0, 0);
  const lines = [
    "root = Stack([intro, ownedNote, grid, summary, formHead, form, actions])",
    `intro = CardHeader("A $1,500 1440p gaming PC", "Voltline sample build. Pickup is the default.")`,
    callout(
      "ownedNote",
      "warning",
      "Replacing your GTX 1070",
      ownedGpu
        ? "You own a GeForce GTX 1070 — purchased Nov 2018. It is left out of this build. Say if you want to replace the case, PSU, RAM, or SSD too."
        : "The old GPU is left out of this build.",
    ),
  ];
  const cardIds = priced.lines.map((line) => {
    const part = getPart(line.sku);
    if (!part) return "";
    const id = `card${slug(line.sku)}`;
    const owned = line.owned && !line.countedInTotal;
    return addProductCard(lines, {
      id,
      part,
      subtitle: `${SLOT_LABEL[line.slot]} · ${part.brand}`,
      priceLabel: owned ? "Owned" : formatMoney(line.price),
      badges: owned
        ? ["In your rig", "Not in the total", sampleRating(part.sku)]
        : [stockLabel(part.stock), storeAvailability(part.sku), sampleRating(part.sku)],
      ownedPhrase: owned ? line.note : undefined,
      primary: { label: "Reserve for pickup", prompt: PICKUP_PROMPT },
      secondary: owned
        ? { label: "Replace", prompt: `Replace the ${part.name} I already own in my 1440p build` }
        : line.slot === "gpu"
          ? { label: "Compare", prompt: "Upgrade my GTX 1070 rig for 1440p and compare 3 GPU options." }
          : { label: "Add to build", prompt: `Add the ${part.name} to my 1440p Voltline build` },
    });
  });
  const rows = rowStacks(lines, cardIds.filter(Boolean), "partRow", 2);
  lines.push(`grid = Stack([${rows.join(", ")}])`);

  const summaryChildren = ["sumHead", "sumSpend", "sumBudget", "sumWatts", "sumGauge", "socket", "ram", "psu", "gpuFit", "coolerFit"];
  lines.push(
    `sumHead = CardHeader("Build summary", ${openuiString(`${formatMoney(due)} due of ${formatMoney(priced.budget ?? 0)}`)})`,
    `sumSpend = TextContent(${openuiString(`${formatMoney(priced.ownedValue)} in parts you already own stays out of the total.`)}, "small")`,
    `sumBudget = SingleStackedBarChart(${stringList(["Due today", "Still open"])}, [${due}, ${stillOpen}])`,
    `sumWatts = TextContent(${openuiString(`${draw.watts}W estimated draw · ${headroom}W of headroom on the ${psu?.name ?? "PSU"}.`)}, "small")`,
    `sumGauge = RadialChart(${stringList(["Draw", "Headroom"])}, [${draw.watts}, ${Math.max(headroom, 0)}])`,
  );
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
    `summary = Card([${summaryChildren.join(", ")}], "card", "column", "s")`,
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
    `pickupBtn = Button("Reserve for in-store pickup", @ToAssistant(${openuiString(PICKUP_PROMPT)}), "primary")`,
    `shipBtn = Button("Ship instead", @ToAssistant("Ship the $1,500 gaming build instead of pickup"), "secondary")`,
  );
  return `${lines.join("\n")}\n`;
}

function shortGpu(name: string): string {
  return name.replace("GeForce ", "").replace("Radeon ", "");
}

export function upgradeProgram(): string {
  const cards = GPU_COMPARE_SKUS.map((sku) => getPart(sku)).filter((part) => part !== undefined);
  const maxPrice = Math.max(...cards.map((card) => card.price));
  const maxFps = Math.max(...cards.map((card) => card.fps1440p ?? 0));
  const lines = [
    "root = Stack([heading, note, compareRow, chartCard])",
    `heading = CardHeader("Three cards to replace a GTX 1070", "Price and 1440p performance, indexed so they share a chart")`,
    callout(
      "note",
      "info",
      "You own a GeForce GTX 1070 — purchased Nov 2018",
      "These three are new cards. None of them are added to a cart until you reserve pickup.",
    ),
  ];
  const cardIds = cards.map((card) =>
    addProductCard(lines, {
      id: `gpu${slug(card.sku)}`,
      part: card,
      subtitle: card.brand,
      badges: [stockLabel(card.stock), storeAvailability(card.sku), sampleRating(card.sku)],
      primary: { label: "Reserve for pickup", prompt: `Reserve the ${card.name} for in-store pickup` },
      secondary: { label: "Add to build", prompt: `Add the ${card.name} to my 1440p Voltline build` },
    }),
  );
  lines.push(
    `compareRow = Stack([${cardIds.join(", ")}], "row", "m", "stretch", "start")`,
    `chartHead = CardHeader("Price vs performance", "100 is the highest price or the highest 1440p FPS in this set")`,
    `chart = BarChart(labels, [priceIdx, fpsIdx], "grouped", "Card", "Index (100 = highest)", 260)`,
    `labels = ${stringList(cards.map((card) => shortGpu(card.name)))}`,
    `priceIdx = Series("Price index", [${cards.map((card) => Math.round((card.price / maxPrice) * 100)).join(", ")}])`,
    `fpsIdx = Series("Performance index", [${cards.map((card) => Math.round(((card.fps1440p ?? 0) / maxFps) * 100)).join(", ")}])`,
    `caption = TextContent("Dollars, FPS, watts, and length are in the spec table under the chart.", "small")`,
    "specTable = Table([card, price, fpsCol, draw, length])",
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
    col(
      "length",
      "Length",
      cards.map((card) => `${card.lengthMm ?? 0} mm`),
    ),
    `chartCard = Card([chartHead, chart, caption, specTable], "card", "column", "s")`,
  );
  return `${lines.join("\n")}\n`;
}

function warrantyLabel(order: OrderRecord): string {
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

function addOrderCard(lines: string[], order: OrderRecord): string {
  const id = `ord${slug(order.id)}`;
  const imageIds = order.items.map((item, index) => {
    const part = getPart(item.sku);
    const imgId = `${id}Img${index}`;
    lines.push(
      `${imgId} = ImageBlock("/parts/${part?.category ?? "peripheral"}.svg", ${openuiString(`${item.name} illustration`)})`,
    );
    return imgId;
  });
  const children = [`${id}Head`, `${id}Tags`, `${id}Imgs`, `${id}Names`, `${id}Steps`];
  const how = order.fulfillment === "pickup" ? "Pickup" : "Shipped";
  lines.push(
    `${id}Head = CardHeader(${openuiString(order.id)}, ${openuiString(formatLongDate(order.date))})`,
    `${id}Tags = TagBlock(${stringList([how, warrantyLabel(order)])}, "sm")`,
    `${id}Imgs = Stack([${imageIds.join(", ")}], "row", "s", "stretch", "start")`,
    `${id}Names = TagBlock(${stringList(order.items.map((item) => item.name))}, "sm")`,
    `${id}Steps = Steps([${id}Placed, ${id}Fulfilled, ${id}Window])`,
    `${id}Placed = StepsItem("Placed", ${openuiString(formatLongDate(order.date))})`,
    `${id}Fulfilled = StepsItem(${openuiString(how)}, ${openuiString(order.storeName ?? "Shipped to you")})`,
    `${id}Window = StepsItem("Return window", ${openuiString(
      order.returnWindowOpen
        ? `Open until ${formatLongDate(order.returnClosesOn)}`
        : `Closed ${formatLongDate(order.returnClosesOn)}`,
    )})`,
  );
  const buttons: string[] = [];
  if (order.items.some((item) => item.warranty === "expiring_soon")) {
    buttons.push(`${id}Extend`);
    lines.push(
      `${id}Extend = Button("Extend warranty", @ToAssistant("My monitor protection plan is expiring. Show extension options."), "primary", "normal", "small")`,
    );
  }
  if (order.returnWindowOpen) {
    buttons.push(`${id}Help`);
    lines.push(
      `${id}Help = Button("Help with this item", @ToAssistant("Help me with a return for the keyboard on my latest order."), "secondary", "normal", "small")`,
    );
  }
  if (buttons.length > 0) {
    children.push(`${id}Actions`);
    lines.push(`${id}Actions = Buttons([${buttons.join(", ")}])`);
  }
  lines.push(`${id} = Card([${children.join(", ")}], "card", "column", "s")`);
  return id;
}

export function ordersProgram(): string {
  const orders = orderHistory();
  const lines: string[] = [];
  const cardIds = orders.map((order) => addOrderCard(lines, order));
  lines.unshift(
    `root = Stack([heading, hint, ${cardIds.join(", ")}])`,
    `heading = CardHeader("Alex Rivera", "Sample orders through Oct 20, 2026")`,
    callout(
      "hint",
      "warning",
      "Kiln View 27 protection expires Nov 5, 2026",
      "That plan can still be extended. The Drift Cue Headset plan is already expired.",
    ),
  );
  return `${lines.join("\n")}\n`;
}

export function warrantyProgram(): string {
  const quote = quoteWarrantyExtension(MONITOR_WARRANTY.orderId, MONITOR_WARRANTY.sku);
  const monitor = getPart(MONITOR_WARRANTY.sku);
  if (!("extendable" in quote) || !quote.extendable || !monitor) {
    return fallbackProgram();
  }
  const lines: string[] = [
    "root = Stack([monitorCard, notice, planRow])",
    callout(
      "notice",
      "warning",
      `Your protection plan on ${quote.name} expires ${formatLongDate(quote.expiresOn)}`,
      "Sample prices. Extending does not charge a card in this demo.",
    ),
  ];
  const monitorId = addProductCard(lines, {
    id: "monitorCard",
    part: monitor,
    subtitle: `Order ${MONITOR_WARRANTY.orderId}`,
    badges: [`Expires ${formatLongDate(quote.expiresOn)}`, "Shipped", sampleRating(monitor.sku)],
    primary: {
      label: "Extend warranty",
      prompt: "Extend the Kiln View 27 protection plan by 2 years",
    },
    secondary: { label: "Reserve for pickup", prompt: "Reserve a Kiln View 27 for in-store pickup" },
  });
  const planIds = quote.plans.map((plan) => {
    const id = `plan${slug(plan.id)}`;
    lines.push(
      `${id}Head = CardHeader(${openuiString(plan.label)}, "Adds time to the Kiln View 27 plan")`,
      `${id}Price = TextContent(${openuiString(formatMoney(plan.price))}, "large-heavy")`,
      `${id}Btn = Button(${openuiString(`Choose ${plan.label}`)}, @ToAssistant(${openuiString(`Extend the Kiln View 27 protection plan by ${plan.label}`)}), "primary", "normal", "small")`,
      `${id}Actions = Buttons([${id}Btn])`,
      `${id} = Card([${id}Head, ${id}Price, ${id}Actions], "card", "column", "s")`,
    );
    return id;
  });
  lines.push(`planRow = Stack([${planIds.join(", ")}], "row", "m", "stretch", "start")`);
  if (monitorId !== "monitorCard") {
    lines[0] = `root = Stack([${monitorId}, notice, planRow])`;
  }
  return `${lines.join("\n")}\n`;
}

export function supportProgram(): string {
  const opened = startSupportRequest(RETURN_ITEM);
  const keyboard = getPart(RETURN_ITEM.sku);
  const caseId = "caseId" in opened ? opened.caseId : "VL-RMA-2140";
  const lines = [
    "root = Stack([itemCard, context, form, confirm])",
    callout(
      "context",
      "info",
      "Return window is open",
      "Purchased Oct 2, 2026 and shipped. The form is prefilled from that order. Sample only.",
    ),
  ];
  if (keyboard) {
    addProductCard(lines, {
      id: "itemCard",
      part: keyboard,
      subtitle: "Order VL-ORD-2140 · shipped",
      badges: ["Return window open", stockLabel(keyboard.stock), sampleRating(keyboard.sku)],
      ownedPhrase: undefined,
      primary: { label: "Reserve for pickup", prompt: "Reserve a Drift Key TKL for in-store pickup" },
      secondary: { label: "Add to build", prompt: "Add the Drift Key TKL to my 1440p Voltline build" },
    });
  }
  lines.push(
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
    `confirmHead = CardHeader("Return requested", "Drift Key TKL")`,
    `confirmCode = TextContent(${openuiString(caseId)}, "large-heavy")`,
    callout(
      "confirmNote",
      "success",
      `Case ${caseId}`,
      "Return requested for the Drift Key TKL. This is a sample RMA. Nothing is shipped back.",
    ),
    `confirm = Card([confirmHead, confirmCode, confirmNote], "card", "column", "s")`,
  );
  return `${lines.join("\n")}\n`;
}

export function pickupProgram(): string {
  const stock = checkStoreStock([...GAMING_PICKUP_SKUS]);
  const reserved = placePickupOrder({ storeId: PICKUP_STORE_ID, skus: [...GAMING_PICKUP_SKUS] });
  const storeLines = "lines" in stock ? stock.lines : [];
  const lines = [
    "root = Stack([heading, storeGrid, confirm])",
    `heading = CardHeader("Reserve for in-store pickup", "The four parts this build still needs. Owned parts stay home.")`,
  ];
  const storeIds = storeLines.map((store) => {
    const id = `shop${slug(store.storeId)}`;
    const children = [`${id}Img`, `${id}Head`, `${id}Tags`];
    const tags = [store.hours, miles(store.distanceMiles), store.inStock ? "In stock" : "Out of stock"];
    if (store.inStock) tags.push(store.readyBy);
    lines.push(
      `${id}Img = ImageBlock("/parts/store.svg", ${openuiString(`${store.storeName} illustration`)})`,
      `${id}Head = CardHeader(${openuiString(store.storeName)}, ${openuiString(store.address)})`,
      `${id}Tags = TagBlock(${stringList(tags)}, "sm")`,
    );
    if (store.inStock) {
      children.push(`${id}Actions`);
      lines.push(
        `${id}Reserve = Button("Reserve here", @ToAssistant(${openuiString(`Reserve the gaming build for pickup at ${store.storeName}`)}), "primary", "normal", "small")`,
        `${id}Actions = Buttons([${id}Reserve])`,
      );
    } else {
      children.push(`${id}Miss`);
      lines.push(
        callout(
          `${id}Miss`,
          "warning",
          "Out of stock",
          store.missing.length > 0 ? `Missing ${store.missing.map((item) => item.name).join(", ")}.` : "This store cannot fill the build.",
        ),
      );
    }
    lines.push(`${id} = Card([${children.join(", ")}], "card", "column", "s")`);
    return id;
  });
  const rows = rowStacks(lines, storeIds, "storeRow", 2);
  lines.push(`storeGrid = Stack([${rows.join(", ")}])`);
  if (reserved.ok) {
    lines.push(
      `mark = ImageBlock("/parts/pickup-mark.svg", "Decorative mosaic for the pickup code. Not a scannable code.")`,
      `codeHead = CardHeader("Pickup code", ${openuiString(reserved.storeName)})`,
      `code = TextContent(${openuiString(reserved.code)}, "large-heavy")`,
      `when = TextContent(${openuiString(`Ready by ${reserved.readyBy} · ${reserved.window}`)}, "large")`,
      `where = TextContent(${openuiString(`${reserved.address}. ${formatMoney(reserved.total)} due at the counter.`)}, "small")`,
      `held = TagBlock(${stringList(reserved.lines.map((line) => line.name))}, "sm")`,
      callout(
        "confirmNote",
        "success",
        `Reserved · code ${reserved.code}`,
        "Sample reservation, not a charge. Bring the parts you already own.",
      ),
      `confirm = Card([mark, codeHead, code, when, where, held, confirmNote], "card", "column", "m")`,
    );
  } else {
    lines.push(callout("confirm", "error", "Could not reserve", reserved.error));
  }
  return `${lines.join("\n")}\n`;
}

export function fallbackProgram(): string {
  return `root = Stack([heading, body])
heading = CardHeader("Voltline demo mode", "This reply was not sent to a model")
body = Callout("neutral", "Try a starter", "The gaming build is a grid of product cards, orders are cards, and pickup reserves a store. Set OPENAI_API_KEY for any other question.")
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

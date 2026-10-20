export type Starter = {
  id: "gaming" | "upgrade" | "orders" | "warranty" | "support" | "pickup";
  displayText: string;
  prompt: string;
};

/** Welcome-screen prompts. Each one opens a different Voltline flow. */
export const STARTERS: Starter[] = [
  {
    id: "gaming",
    displayText: "$1,500 1440p build",
    prompt: "Build me a $1,500 1440p gaming PC. Reuse parts I already own.",
  },
  {
    id: "upgrade",
    displayText: "Replace my GTX 1070",
    prompt: "Upgrade my GTX 1070 rig for 1440p and compare 3 GPU options.",
  },
  {
    id: "orders",
    displayText: "Order history",
    prompt: "Show my order history",
  },
  {
    id: "warranty",
    displayText: "Extend a warranty",
    prompt: "My monitor protection plan is expiring. Show extension options.",
  },
  {
    id: "support",
    displayText: "Return an item",
    prompt: "Help me with a return for the keyboard on my latest order.",
  },
  {
    id: "pickup",
    displayText: "Reserve for pickup",
    prompt: "Reserve the $1,500 gaming build for in-store pickup.",
  },
];

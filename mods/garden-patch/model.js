export const CROPS = [
  { key: "strawberry", name: "Strawberry", color: "#f46b72" },
  { key: "carrot", name: "Carrot", color: "#ffab52" },
  { key: "tomato", name: "Tomato", color: "#f97355" },
  { key: "corn", name: "Corn", color: "#f3d76a" },
  { key: "blueberry", name: "Blueberry", color: "#a4a1f7" },
  { key: "sunflower", name: "Sunflower", color: "#f6d35d" },
  { key: "watermelon", name: "Watermelon", color: "#92cd5a" },
  { key: "bamboo", name: "Bamboo", color: "#a8dd82" },
];
export const STATES = {
  blocked: { label: "Needs you", badge: "!", color: "#ffbe69", stage: "ripe", rank: 0 },
  done: { label: "Harvest ready", badge: "✓", color: "#c9ec8b", stage: "ripe", rank: 1 },
  working: { label: "Growing", badge: "•", color: "#82d5f0", stage: "growing", rank: 2 },
  idle: { label: "Resting", badge: "z", color: "#c0c7b2", stage: "seedling", rank: 3 },
};
export function stateFor(status) { return STATES[status] ?? STATES.idle; }
export function cropFor(address) {
  let h = 2166136261;
  for (const ch of String(address)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return CROPS[(h >>> 0) % CROPS.length];
}
export function focusTarget(agent) {
  return agent.pane ? { command: "pane.focus", args: { pane: agent.pane } }
    : { command: "terminal.peek", args: { terminal: agent.address } };
}
export function orderPlants(items) {
  return [...items].sort((a, b) => stateFor(a.status).rank - stateFor(b.status).rank || String(a.address).localeCompare(String(b.address)));
}
export function pageSize(width, height) {
  const columns = Math.max(1, Math.min(8, Math.floor((width - 44) / 154)));
  const rows = height >= 430 ? 2 : 1;
  return { columns, rows, count: columns * rows };
}

export const STATES = {
  blocked: { label: "Needs you", badge: "!", color: "#ffbe69", pose: "blocked", rank: 0 },
  done: { label: "Done", badge: "✓", color: "#c9ec8b", pose: "done", rank: 1 },
  working: { label: "Working", badge: "•", color: "#82d5f0", pose: "working", rank: 2 },
  idle: { label: "Idle", badge: "z", color: "#c0c7b2", pose: "idle", rank: 3 },
};
export function stateFor(status) { return STATES[status] ?? STATES.idle; }
export function focusTarget(agent) {
  return agent.pane ? { command: "pane.focus", args: { pane: agent.pane } }
    : { command: "terminal.peek", args: { terminal: agent.address } };
}
export function orderAgents(items) {
  return [...items].sort((a, b) => stateFor(a.status).rank - stateFor(b.status).rank || String(a.address).localeCompare(String(b.address)));
}
export function pageSize(width, height) {
  const columns = Math.max(1, Math.min(8, Math.floor((width - 44) / 154)));
  const rows = height >= 430 ? 2 : 1;
  return { columns, rows, count: columns * rows };
}

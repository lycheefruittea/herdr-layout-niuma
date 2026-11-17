import { View, div, image } from "gpui-kit";
import { spaces, panes, terminals, focused, layout, props, theme, run, hc, exec,
  home, knownAgents, nextCommand, notify, checking } from "herdr";

const ART = "mods/garden-patch/assets";
function findNode(node, id) {
  if (!node || typeof node !== "object") return null;
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}
const quote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
const commandLine = (argv) => argv.map(quote).join(" ");
const shortPath = (path) => path?.startsWith(home()) ? `~${path.slice(home().length)}` : path ?? "";

export default class GardenBar extends View {
  init(_props, cx) {
    this.shell = props()?.role === "shell";
    this.agents = [];
    this.busy = false;
    if (checking()) return;
    if (this.shell) {
      this.watchShell(cx);
      cx.timer.every(4000, (cx) => this.watchShell(cx));
    } else {
      this.loadAgents(cx);
      cx.timer.every(60000, (cx) => this.loadAgents(cx));
      cx.spawn(async (cx) => {
        for (;;) {
          const command = await nextCommand();
          if (command === "split") this.split();
          else if (command === "split-agent") this.split(this.agents[0]?.run);
          cx.notify();
        }
      });
    }
  }

  loadAgents(cx) {
    cx.spawn(async (cx) => {
      try { this.agents = (await knownAgents()).filter((a) => a.installed).slice(0, 3); }
      catch { this.agents = []; }
      cx.notify();
    });
  }

  split(argv) {
    const focus = focused();
    if (!focus?.space) return run("space.new", argv?.length ? { argv } : {});
    const columns = Object.fromEntries(terminals().map((t) => [t.address, t.cols ?? 0]));
    const here = panes().filter((p) => p.tab === focus.tab);
    const target = [...here].sort((a, b) => (columns[b.terminal] ?? 0) - (columns[a.terminal] ?? 0))[0];
    const name = target ? "pane.split" : "tab.new";
    const args = target ? { pane: target.pane, direction: "right" } : { space: focus.space };
    if (!argv?.length) return run(name, args);
    // A shell panel loads the user's shell setup before starting their chosen agent.
    exec("herdr-app", ["do", name, JSON.stringify(args)]).then(async (result) => {
      if (result.code !== 0) throw new Error(result.stderr || result.stdout || "Could not create a panel");
      const made = JSON.parse(result.stdout);
      if (!made.terminal) throw new Error("The new panel did not return a terminal");
      const sent = await hc(["send", made.terminal, commandLine(argv)]);
      if (sent.code !== 0) throw new Error(sent.stderr || "Could not start the agent");
    }).catch((error) => notify({ title: "Agent could not start", body: String(error), level: "error" }));
  }

  watchShell(cx) {
    if (this.busy || layout()?.id !== "garden-root") return;
    const address = findNode(layout(), "shell-term")?.content?.terminal;
    if (terminals().some((t) => t.address === address && t.state === "live")) return;
    this.busy = true;
    cx.spawn(async (cx) => {
      try {
        let next = terminals().find((t) => t.state === "live" && !t.address.includes("/")
          && t.name === "garden-shell" && t.labels?.["garden.role"] === "shell")?.address;
        if (!next) {
          const result = await hc(["run", "--json", "--keep", "--bg", "--no-parent", "--name", "garden-shell",
            "--label", "garden.role=shell", "--cwd", home()]);
          if (result.code !== 0) throw new Error(result.stderr || "Shell could not start");
          next = JSON.parse(result.stdout).address;
        }
        const tree = JSON.parse(JSON.stringify(layout()));
        if (tree.id !== "garden-root" || !next) return;
        const column = findNode(tree, "shell");
        if (!column) return;
        const node = findNode(tree, "shell-term");
        if (node) node.content = { terminal: next };
        else column.children.push({ id: "shell-term", type: "block", content: { terminal: next } });
        run("layout.set", { layout: tree });
      } catch (error) { console.log(`garden-bar: ${error}`); }
      finally { this.busy = false; cx.notify(); }
    });
  }

  button(id, label, action, primary = false, tip) {
    const t = theme();
    return div().id(id).flex_none().h(27).px(10).rounded(7).flex().items_center().gap(5)
      .text_size(11.5).font_semibold().bg(primary ? "#c4e68b" : t.raised)
      .text_color(primary ? "#2e4b2b" : t.foreground)
      .border_1().border_color(primary ? "#daefa7" : t.border).cursor_pointer()
      .hover((s) => s.bg(primary ? "#d8efac" : t.hover)).on_click(action)
      .when(!!tip, (el) => el.tooltip(tip)).child(label);
  }

  render() { return this.shell ? this.renderShell() : this.renderMain(); }

  renderMain() {
    const t = theme(), focus = focused(), all = spaces();
    const space = all.find((s) => s.id === focus?.space) ?? all.find((s) => s.active);
    const tabs = (space?.tabs ?? []).filter((tab) => !tab.settled);
    const colors = { working: "#82d5f0", blocked: "#ffbe69", done: "#c9ec8b", idle: t.dim };
    return div().id("garden-bar").size_full().flex().flex_row().items_center().gap(7).px(12).bg(t.chrome)
      .child(image(`${ART}/sprout.svg`).size(24).flex_none())
      .child(div().id("garden-spaces").flex_1().min_w_0().overflow_x_scroll().flex().flex_row().items_center().gap(4)
        .children(all.map((sp) => div().id(`space-${sp.id}`).flex_none().h(27).px(10).rounded(7)
          .bg(sp.id === space?.id ? t.selected : t.chrome).border_1().border_color(sp.id === space?.id ? t.input : t.chrome)
          .flex().items_center().gap(6).cursor_pointer().hover((s) => s.bg(t.hover))
          .tooltip(`${sp.name}${sp.machine ? ` · ${sp.machine}` : ""}`)
          .on_click(() => run("space.select", { id: sp.id }))
          .child(div().size(6).rounded_full().bg(colors[sp.status] ?? t.dim))
          .child(div().max_w(130).truncate().text_size(11.5).text_color(t.foreground).child(sp.name)))))
      .child(this.button("new-space", "+", () => run("space.new"), false, "New space (⌘N)"))
      .when(tabs.length > 1, (el) => el.child(div().id("garden-tabs").max_w(180).overflow_x_scroll().flex().flex_row().gap(3)
        .children(tabs.map((tab) => this.button(`tab-${tab.id}`, tab.named ? tab.name : `Tab ${tab.name}`,
          () => run("tab.select", { id: tab.id }), false)))))
      .child(this.button("garden-settings", "⚙", () => run("app.settings"), false, "Herdr settings"))
      .child(this.button("garden-split", "+ Panel", () => this.split(), false, "New panel (⌘T)"))
      .children(this.agents.map((a, i) => this.button(`start-${a.key}`, a.name, () => this.split(a.run), i === 0,
        `Start ${a.name}${i === 0 ? " (⌘⇧T)" : ""}`)));
  }

  renderShell() {
    const t = theme();
    const address = findNode(layout(), "shell-term")?.content?.terminal;
    const terminal = terminals().find((t) => t.address === address);
    const focus = focused();
    const folder = panes().find((p) => p.pane === focus?.pane)?.cwd;
    const send = (text) => address && hc(["send", "--force", address, text]).catch(() => null);
    return div().id("garden-shell-bar").size_full().px(12).flex().flex_row().items_center().gap(8).bg(t.chrome)
      .child(image(`${ART}/watering-can.svg`).w(26).h(20))
      .child(div().text_size(11.5).font_semibold().text_color(t.foreground).child("Tool shed"))
      .child(div().flex_1().min_w_0().truncate().text_size(10.5).text_color(t.muted).child(terminal ? shortPath(terminal.cwd) : "Starting shell…"))
      .when(!!folder, (el) => el.child(this.button("shell-cd", "Project folder", () => {
        send(`cd ${quote(folder)}`); if (address) run("pane.focus", { terminal: address });
      }, false, folder)))
      .child(this.button("shell-clear", "Clear", () => send("clear")))
      .child(this.button("shell-restart", "Restart", () => address && run("terminal.kill", { terminal: address })));
  }
}

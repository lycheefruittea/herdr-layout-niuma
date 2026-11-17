import { View, div, image } from "gpui-kit";
import { agents, terminals, run, hc, props, settings, checking } from "herdr";
import { STATES, stateFor, focusTarget, orderAgents, pageSize } from "./model.js";

const ART = "mods/garden-patch/assets";
const INK = "#263d2c";
const DEMO = [
  { address: "garden-demo-1", status: "working", title: "Build the inventory", space_name: "farm-shop" },
  { address: "garden-demo-2", status: "blocked", title: "Approve the new design", space_name: "website" },
  { address: "garden-demo-3", status: "done", title: "Ship the daily rewards", space_name: "game-server" },
  { address: "garden-demo-4", status: "idle", title: "Plan the next season", space_name: "notes" },
  { address: "garden-demo-5", status: "working", title: "Grow the test suite", space_name: "quality" },
  { address: "garden-demo-6", status: "done", title: "Polish the fruit stand", space_name: "farm-shop" },
];

export default class Garden extends View {
  init(_props, cx) {
    this.size = { width: 1200, height: 370 };
    this.page = 0;
    this.onlyBlocked = false;
    this.prompts = {};
    if (checking()) return;
    cx.timer.every(6000, (cx) => this.readQuestions(cx));
    this.readQuestions(cx);
  }

  readQuestions(cx) {
    if (props()?.demo || checking()) return;
    for (const agent of agents()) {
      const previous = this.prompts[agent.address];
      if (previous?.busy || (previous && Date.now() - previous.at < (agent.status === "working" ? 6000 : 30000))) continue;
      this.prompts[agent.address] = { ...previous, busy: true, at: Date.now() };
      cx.spawn(async (cx) => {
        let question = previous?.text ?? "";
        try {
          const result = await hc(["read", agent.address, "--lines", "120"]);
          if (result.code === 0) {
            const lines = result.stdout.split("\n");
            const found = [];
            for (let i = 0; i < lines.length; i++) {
              const m = lines[i].match(/^\s*[❯›>]\s+(\S.*)$/u);
              if (!m) continue;
              let before = i - 1;
              while (before >= 0 && !lines[before].trim()) before--;
              if (before >= 0 && /^\s*[─━-]{8,}\s*$/u.test(lines[before])) continue;
              found.push(m[1]);
            }
            if (found.length) question = found.at(-1).trim();
          }
        } catch { /* A terminal may close between the list and the read. */ }
        this.prompts[agent.address] = { text: question, busy: false, at: Date.now() };
        cx.notify();
      });
    }
    const live = new Set(agents().map((a) => a.address));
    for (const key of Object.keys(this.prompts)) if (!live.has(key)) delete this.prompts[key];
  }

  go(agent) {
    if (props()?.demo) return;
    const { command, args } = focusTarget(agent);
    run(command, args);
  }

  scenery(w, h) {
    const els = [
      div().absolute().left(0).top(0).w(w).h(h).bg("#a8d17d"),
      div().absolute().left(0).top(0).w(w).h(102).bg("#c5e7eb"),
      div().absolute().left(-w * .08).top(65).w(w * .7).h(100).rounded_full().bg("#87b66a"),
      div().absolute().left(w * .42).top(77).w(w * .7).h(90).rounded_full().bg("#96c376"),
      div().absolute().left(0).top(113).w(w).h(h).bg("#a8d17d"),
      div().absolute().left(0).bottom(40).w(w).h(21).bg("#d9bf8d")
        .border_t_2().border_b_2().border_color("#bba876"),
      div().absolute().right(66).top(24).size(35).rounded_full().bg("#fff1b1"),
    ];
    for (let i = 0; i < Math.ceil(w / 80); i++) {
      els.push(div().absolute().left(i * 80 + 13).bottom(41).w(1).h(18).bg("#b69c7040"));
      els.push(div().absolute().left(i * 80 + 35).top(129 + (i % 3) * 7).w(3).h(5).bg("#80b35b"));
    }
    for (const [left, top, scale] of [[-36, 46, .75], [w - 90, 50, .8], [w * .24, 69, .34], [w * .68, 69, .32]]) {
      els.push(image(`${ART}/tree.svg`).absolute().left(left).top(top).w(140 * scale).h(154 * scale));
    }
    for (const [left, top, width] of [[w * .18, 33, 46], [w * .56, 22, 62]]) {
      els.push(div().absolute().left(left).top(top).w(width).h(13).rounded(5).bg("#ffffffba")
        .child(div().absolute().left(10).top(-8).w(width * .55).h(15).rounded(4).bg("#ffffffba")));
    }
    return els;
  }

  pill(id, label, selected, action) {
    return div().id(id).h(26).px(10).rounded(8).flex().items_center().text_size(11)
      .text_color(selected ? "#fff7dd" : "#395336").bg(selected ? "#355b3a" : "#edf5d2dc")
      .cursor_pointer().hover((s) => s.bg(selected ? "#416b44" : "#ffffe4"))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action).child(label);
  }

  plot(agent, x, y, width, height, helpers) {
    const state = stateFor(agent.status);
    const question = (this.prompts[agent.address]?.text || agent.title || "Ready for a task").replace(/\s+/g, " ");
    const artworkHeight = Math.max(88, Math.min(151, height - 71));
    const artworkWidth = artworkHeight * 140 / 154;
    const visual = image(`${ART}/noob-${state.pose}.svg`).w(artworkWidth).h(artworkHeight);
    const label = div().flex().flex_row().items_center().gap(4).text_size(10).text_color(INK)
      .child(div().size(5).rounded_full().bg("#f6cd34")).child(div().max_w(width - 50).truncate().child(agent.program?.name ?? "Classic noob"));
    const card = div().id(`noob-${agent.address}`).absolute().left(x).top(y).w(width).h(height)
      .rounded(12).bg("#f6f4daba").border_1().border_color("#ffffdaaa")
      .hover((s) => s.bg("#fff9e3").border_color("#638d50"))
      .cursor_pointer().on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(() => this.go(agent)).tooltip(props()?.demo ? "Preview noob — no terminal attached" : `${question}\n${agent.space_name ?? "Agent"} · ${state.label}`)
      .child(div().absolute().left(10).top(8).child(label))
      .child(div().absolute().right(8).top(7).w(21).h(21).rounded(6).bg(state.color)
        .flex().items_center().justify_center().text_size(12).font_bold().text_color("#36502c")
        .child(state.badge))
      .child(div().absolute().left((width - artworkWidth) / 2).top(28).child(visual))
      .child(div().absolute().left(9).right(9).bottom(10).flex().flex_col().gap(2)
        .child(div().text_size(11).font_semibold().text_color(INK).truncate().child(question))
        .child(div().text_size(9.5).text_color("#5d7150").truncate().child(`${agent.space_name ?? "Agent"} · ${state.label}`)));
    if (agent.status === "working") {
      card.child(div().absolute().left(width / 2 - 9).top(108).text_size(12).font_bold().text_color("#d5f7ed")
        .frames(["·", "··", "···"], 450));
    }
    if (agent.status === "done") {
      card.child(div().absolute().left(width / 2 - 27).top(58).text_size(16).text_color("#ddac30").child("✦")
        .loop("opacity", { from: .3, to: 1, period: 1600 }));
    }
    if (helpers > 0) {
      card.child(image(`${ART}/noob-idle.svg`).absolute().right(4).top(85).w(30).h(33)
        .loop("top", { from: 85, to: 89, period: 1700 }))
        .child(div().absolute().right(5).top(119).px(4).rounded(4).bg("#f8e2a3").text_size(9).text_color(INK).child(`${helpers} helper${helpers === 1 ? "" : "s"}`));
    }
    return card;
  }

  render(cx) {
    const zoom = Number(settings()?.zoom) || 1;
    const w = Math.max(280, this.size.width / zoom), h = Math.max(260, this.size.height / zoom);
    const isDemo = !!props()?.demo;
    const all = isDemo ? DEMO : agents();
    const ts = isDemo ? [] : terminals();
    const addresses = new Set(all.map((a) => a.address));
    const subs = new Map();
    for (const t of ts) if (t.parent && addresses.has(t.parent) && t.state === "live" && t.status !== "done") {
      subs.set(t.parent, (subs.get(t.parent) ?? 0) + 1);
    }
    const children = new Set(ts.filter((t) => t.parent && addresses.has(t.parent)).map((t) => t.address));
    const roots = orderAgents(all.filter((a) => !children.has(a.address)));
    const list = this.onlyBlocked ? roots.filter((a) => a.status === "blocked") : roots;
    const geometry = pageSize(w, h);
    const pages = Math.max(1, Math.ceil(list.length / geometry.count));
    this.page = Math.min(this.page, pages - 1);
    const shown = list.slice(this.page * geometry.count, (this.page + 1) * geometry.count);
    const counts = Object.fromEntries(Object.keys(STATES).map((s) => [s, roots.filter((a) => a.status === s).length]));
    const terminalCount = ts.filter((t) => t.state === "live" && !addresses.has(t.address)
      && !children.has(t.address) && (t.labels?.["herdr.space"] || t.labels?.["garden.role"] === "shell")).length;
    const els = this.scenery(w, h);
    const header = div().absolute().left(20).right(20).top(14).h(43).flex().flex_row().items_center().gap(10)
      .child(div().size(34).rounded(10).bg("#edf4d2").child(image(`${ART}/noob-face.svg`).size(34)))
      .child(div().flex().flex_col().gap(1)
        .child(div().text_size(18).font_bold().text_color(INK).child("Your noob crew"))
        .child(div().text_size(10).text_color("#55734b").child(isDemo ? "GARDEN PREVIEW · sample agents" : "AGENTS AT WORK")))
      .child(div().flex_1());
    if (w > 640) header.child(this.pill("filter-all", `${roots.length} noobs`, !this.onlyBlocked, (_e, cx) => { this.onlyBlocked = false; this.page = 0; cx.notify(); }))
      .child(this.pill("filter-help", `${counts.blocked} need you`, this.onlyBlocked, (_e, cx) => { this.onlyBlocked = !this.onlyBlocked; this.page = 0; cx.notify(); }));
    els.push(header);
    if (shown.length) {
      const gap = 10, available = w - 44;
      const cols = Math.min(geometry.columns, shown.length);
      const cardWidth = Math.min(157, (available - (cols - 1) * gap) / cols);
      const rows = Math.ceil(shown.length / geometry.columns);
      const cardHeight = Math.min(220, (h - 127 - (rows - 1) * 10) / rows);
      const rowWidth = cols * cardWidth + (cols - 1) * gap;
      shown.forEach((a, i) => els.push(this.plot(a, (w - rowWidth) / 2 + (i % geometry.columns) * (cardWidth + gap),
        76 + Math.floor(i / geometry.columns) * (cardHeight + 10), cardWidth, cardHeight,
        isDemo && a.status === "working" ? 2 : subs.get(a.address) ?? 0)));
    } else {
      const wide = w >= 660;
      if (wide) {
        els.push(image(`${ART}/noob-idle.svg`).absolute().left(w / 2 - 310).top(103).w(130).h(143));
        els.push(image(`${ART}/noob-done.svg`).absolute().left(w / 2 + 175).top(89).w(138).h(152));
      }
      els.push(div().absolute().left(w / 2 - Math.min(180, (w - 30) / 2)).top(110).w(Math.min(360, w - 30)).flex().flex_col().items_center().gap(7)
        .child(image(`${ART}/noob-face.svg`).w(53).h(53))
        .child(div().text_size(20).font_bold().text_color(INK).child(this.onlyBlocked ? "Your crew has it covered" : "Your crew is ready"))
        .child(div().text_size(12).text_color("#47663f").child(this.onlyBlocked ? "No agents need your attention." : "Start an agent below to put a noob to work.")));
    }
    const footer = div().absolute().left(18).right(18).bottom(9).h(24).flex().flex_row().items_center().gap(12);
    const visibleStates = w > 680 ? ["working", "blocked", "done", "idle"] : ["working", "blocked", "done"];
    for (const name of visibleStates) {
      const state = STATES[name];
      footer.child(div().flex().flex_row().items_center().gap(4).text_size(w < 550 ? 9 : 10).text_color("#375332")
        .child(div().size(6).rounded_full().bg(state.color)).child(`${state.label} ${counts[name]}`));
    }
    footer.child(div().flex_1());
    if (pages > 1) footer
      .child(this.pill("page-prev", "‹", false, (_e, cx) => { this.page = (this.page + pages - 1) % pages; cx.notify(); }))
      .child(div().text_size(10).text_color(INK).child(`${this.page + 1}/${pages}`))
      .child(this.pill("page-next", "›", false, (_e, cx) => { this.page = (this.page + 1) % pages; cx.notify(); }));
    if (w > 800) footer.child(image(`${ART}/watering-can.svg`).w(27).h(21))
      .child(div().text_size(10).text_color("#47663f").child(`${isDemo ? 2 : terminalCount} terminals`));
    els.push(footer);
    return div().id("garden").size_full().relative().overflow_hidden().bg("#a8d17d")
      .on_size_change((size, cx) => { this.size = size; cx.notify(); }).children(els);
  }
}

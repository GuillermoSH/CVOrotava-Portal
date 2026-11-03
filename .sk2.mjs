import fs from "node:fs";
function edit(f, fn) {
  let s = fs.readFileSync(f, "utf8");
  const crlf = s.includes("\r\n");
  s = fn(s.replace(/\r\n/g, "\n"));
  fs.writeFileSync(f, crlf ? s.replace(/\n/g, "\r\n") : s);
}
const must = (s, a, b) => { if (!s.includes(a)) throw new Error("missing " + a.slice(0, 60)); return s.replace(a, b); };

edit("lib/layout/dashboard-route-chrome.ts", (s) => {
  s = must(s, '  | "player-form"\n', '  | "player-form"\n  | "player-detail"\n');
  s = must(s, '      hideHeader: true,\n      skeleton: "player-form",', '      hideHeader: true,\n      skeleton: "player-detail",');
  return s;
});
edit("components/shared/skeletons/PageSkeletons.tsx", (s) => {
  s = must(s, 'import { appRoutes } from "@/lib/constants";', 'import { appRoutes } from "@/lib/constants";\nimport { cn } from "@/lib/utils";');
  s = must(s, 'function PlayerFormBody() {\n  const panel = "', 'function PlayerFormBody({ withBar = false }: { withBar?: boolean }) {\n  const panel = "');
  s = must(s, '  return (\n    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]', '  return (\n    <div className={cn(withBar && "-mt-4 lg:-mt-6")}>\n      {withBar ? <PlayerBarBone /> : null}\n    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]');
  s = must(s, '    "player-form": <PlayerFormBody />,', '    "player-form": <PlayerFormBody />,\n    "player-detail": <PlayerFormBody withBar />,');
  return s;
});

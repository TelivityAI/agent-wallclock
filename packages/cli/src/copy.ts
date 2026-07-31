import { spawnSync } from "node:child_process";
import { platform } from "node:os";

export function clipboardHint(): string {
  const os = platform();
  if (os === "darwin") {
    return "On macOS, ensure `pbcopy` is available in PATH.";
  }
  if (os === "win32") {
    return "On Windows, ensure `clip` is available (usually built-in).";
  }
  return "On Linux, install `wl-copy` (Wayland) or `xclip` (X11).";
}

export function copyToClipboard(text: string): boolean {
  const os = platform();
  try {
    if (os === "darwin") {
      const result = spawnSync("pbcopy", [], { input: text, encoding: "utf8" });
      return result.status === 0;
    }
    if (os === "win32") {
      const result = spawnSync("clip", [], { input: text, encoding: "utf8", shell: true });
      return result.status === 0;
    }
    const wl = spawnSync("wl-copy", [], { input: text, encoding: "utf8" });
    if (wl.status === 0) return true;
    const xclip = spawnSync("xclip", ["-selection", "clipboard"], {
      input: text,
      encoding: "utf8",
    });
    return xclip.status === 0;
  } catch {
    return false;
  }
}

import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const isWindows = process.platform === "win32"
const npmCommand = isWindows ? "cmd.exe" : "npm"
const npmArgs = isWindows ? ["/d", "/s", "/c", "npm run dev"] : ["run", "dev"]
const spawnOptions = { stdio: "inherit" }
const processes = [
  spawn(npmCommand, npmArgs, { ...spawnOptions, cwd: root }),
  spawn(npmCommand, npmArgs, { ...spawnOptions, cwd: path.join(root, "server") }),
]

function stopAll() {
  processes.forEach((child) => child.kill())
}

process.on("SIGINT", stopAll)
process.on("SIGTERM", stopAll)
processes.forEach((child) => child.on("exit", (code) => {
  if (code && code !== 0) process.exitCode = code
}))
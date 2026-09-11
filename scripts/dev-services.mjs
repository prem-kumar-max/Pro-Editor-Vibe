import { spawn } from "node:child_process"
import { existsSync } from "node:fs"

const docker = process.platform === "win32"
  ? [`${process.env.ProgramFiles}\\Docker\\Docker\\resources\\bin\\docker.exe`, "docker"].find((candidate) => candidate === "docker" || existsSync(candidate))
  : "docker"

if (!docker) {
  console.error("Docker CLI was not found. Install and start Docker Desktop, then reopen this terminal.")
  process.exit(1)
}

const child = spawn(docker, ["compose", "up", "--build"], { cwd: process.cwd(), stdio: "inherit" })
child.on("error", (error) => {
  console.error(`Could not start Docker Compose: ${error.message}`)
  process.exit(1)
})
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
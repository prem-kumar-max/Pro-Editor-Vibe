import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"

const dockerCandidates = process.platform === "win32"
  ? [`${process.env.ProgramFiles}\\Docker\\Docker\\resources\\bin\\docker.exe`, "docker"]
  : ["docker"]
const dockerCommand = dockerCandidates.find((candidate) => candidate === "docker" || existsSync(candidate))

const result = dockerCommand
  ? spawnSync(dockerCommand, ["version", "--format", "{{.Server.Version}}"], { stdio: "pipe", encoding: "utf8" })
  : { error: { code: "ENOENT" }, status: 1 }

if (result.error?.code === "ENOENT") {
  console.error("Docker CLI was not found. Install and start Docker Desktop, then reopen this terminal.")
  process.exit(1)
}

if (result.status !== 0) {
  console.error("Docker CLI is installed, but Docker Desktop/the Docker engine is not running.")
  console.error("Start Docker Desktop and run this command again.")
  process.exit(result.status || 1)
}

console.log(`Docker engine ${result.stdout.trim()} is available.`)
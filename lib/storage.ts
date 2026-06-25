import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs"
import path from "node:path"

const storageDir = path.join(process.cwd(), "storage")

export function ensureStorageDir() {
  if (!existsSync(storageDir)) {
    mkdirSync(storageDir, { recursive: true })
  }
}

export function getProjectStorageDir(projectId: string) {
  ensureStorageDir()
  const dir = path.join(storageDir, projectId)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function saveProjectFile(projectId: string, filename: string, bytes: Buffer) {
  const dir = getProjectStorageDir(projectId)
  const safeName = filename.replace(/[\\/:*?"<>|]/g, "_")
  const filePath = path.join(dir, safeName)
  writeFileSync(filePath, bytes)
  return filePath
}

export function removeProjectFile(filePath: string) {
  if (existsSync(filePath)) {
    unlinkSync(filePath)
  }
}

export function listProjectFiles(projectId: string) {
  const dir = getProjectStorageDir(projectId)
  return readdirSync(dir).map((name) => {
    const filePath = path.join(dir, name)
    const stats = statSync(filePath)
    return { name, path: filePath, size: stats.size, mtime: stats.mtime.toISOString() }
  })
}

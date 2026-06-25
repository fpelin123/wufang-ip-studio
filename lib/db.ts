import Database from "better-sqlite3"
import { mkdirSync } from "node:fs"
import path from "node:path"

import { providers, reviewIssues } from "@/lib/data"
import type { Project, Provider, ReviewIssue } from "@/lib/data"

type StudioProject = Project & {
  deliverables: string[]
  referenceFiles?: string[]
}

export type StudioProjectLock = {
  projectId: string
  userId: string
  userName: string
  role: string
  acquiredAt: number
  updatedAt: number
}

type StudioProvider = Provider & {
  apiKey?: string
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
}

type StudioReviewIssue = ReviewIssue & {
  projectId?: string
  createdAt?: string
}

export type StudioTaskBinding = {
  task: string
  model: string
  type: string
}

type StudioAsset = {
  id: string
  projectId: string
  name: string
  type: string
  size: number
  category: "document" | "image" | "video" | "audio" | "other"
  addedAt: string
  filePath?: string
}

type StudioAuditEvent = {
  id: string
  scope: string
  action: string
  target: string
  detail: string
  actor: string
  createdAt: string
}

type StudioTeamMember = {
  id: string
  name: string
  email: string
  role: "admin" | "editor" | "reviewer" | "viewer"
  status: "active" | "invited" | "disabled"
  lastActiveAt: string
}

const dataDir = path.join(process.cwd(), "data")
const dbPath = path.join(dataDir, "wufang-ip-studio.sqlite")

let database: Database.Database | null = null

export function getDb() {
  if (!database) {
    mkdirSync(dataDir, { recursive: true })
    database = new Database(dbPath)
    database.pragma("journal_mode = WAL")
    database.pragma("foreign_keys = ON")
    initializeDatabase(database)
  }

  return database
}

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      platform TEXT NOT NULL,
      aspect TEXT NOT NULL,
      episodes INTEGER NOT NULL,
      duration TEXT NOT NULL,
      owner TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      progress INTEGER NOT NULL,
      status TEXT NOT NULL,
      current_step TEXT NOT NULL,
      deliverables TEXT NOT NULL,
      reference_files TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS workflow_documents (
      project_id TEXT NOT NULL,
      step_key TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (project_id, step_key),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workflow_document_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      step_key TEXT NOT NULL,
      version_label TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER NOT NULL,
      category TEXT NOT NULL,
      added_at TEXT NOT NULL,
      file_path TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_issues (
      id TEXT PRIMARY KEY,
      project TEXT NOT NULL,
      project_id TEXT,
      location TEXT NOT NULL,
      severity TEXT NOT NULL,
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      reviewer TEXT NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      base_url TEXT NOT NULL,
      api_key TEXT,
      text_model TEXT NOT NULL,
      long_model TEXT NOT NULL,
      vision_model TEXT NOT NULL,
      image_model TEXT NOT NULL,
      enabled INTEGER NOT NULL,
      status TEXT NOT NULL,
      temperature REAL,
      max_tokens INTEGER,
      timeout_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      detail TEXT NOT NULL,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      last_active_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_locks (
      project_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      role TEXT NOT NULL,
      acquired_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `)

  seedProviders(db)
  seedReviewIssues(db)
  seedSettings(db)
  seedAuditEvents(db)
  seedTeamMembers(db)
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function seedProviders(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM providers").get() as { count: number }
  if (count.count > 0) return

  const insert = db.prepare(`
    INSERT INTO providers (
      id, name, type, base_url, api_key, text_model, long_model, vision_model,
      image_model, enabled, status, temperature, max_tokens, timeout_ms
    ) VALUES (
      @id, @name, @type, @baseUrl, @apiKey, @textModel, @longModel, @visionModel,
      @imageModel, @enabled, @status, @temperature, @maxTokens, @timeoutMs
    )
  `)

  for (const provider of providers) {
    insert.run({
      ...provider,
      apiKey: "",
      enabled: provider.enabled ? 1 : 0,
      temperature: 0.7,
      maxTokens: 4000,
      timeoutMs: 60000,
    })
  }
}

function seedReviewIssues(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM review_issues").get() as { count: number }
  if (count.count > 0) return

  const insert = db.prepare(`
    INSERT INTO review_issues (
      id, project, project_id, location, severity, type, summary, status, reviewer, created_at
    ) VALUES (
      @id, @project, @projectId, @location, @severity, @type, @summary, @status, @reviewer, @createdAt
    )
  `)

  for (const issue of reviewIssues) {
    insert.run({ ...issue, projectId: null, createdAt: null })
  }
}

function seedSettings(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM settings").get() as { count: number }
  if (count.count > 0) return

  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
    "taskBindings",
    JSON.stringify([
      { task: "策划 / 剧本生成", model: "deepseek-chat", type: "文本模型" },
      { task: "长文档处理", model: "qwen-long", type: "长文本模型" },
      { task: "视觉锚点理解", model: "gpt-4o", type: "视觉模型" },
      { task: "出图生成", model: "dall-e-3", type: "图片模型" },
    ]),
  )
}

function seedAuditEvents(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM audit_events").get() as { count: number }
  if (count.count > 0) return

  const insert = db.prepare(`
    INSERT INTO audit_events (id, scope, action, target, detail, actor, created_at)
    VALUES (@id, @scope, @action, @target, @detail, @actor, @createdAt)
  `)

  const now = new Date().toLocaleString("zh-CN", { hour12: false })
  insert.run({
    id: "audit-seed-1",
    scope: "system",
    action: "初始化",
    target: "Wufang IP Studio",
    detail: "数据库表创建并完成基础同步。",
    actor: "system",
    createdAt: now,
  })
}

function seedTeamMembers(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM team_members").get() as { count: number }
  if (count.count > 0) return

  const insert = db.prepare(`
    INSERT INTO team_members (id, name, email, role, status, last_active_at)
    VALUES (@id, @name, @email, @role, @status, @lastActiveAt)
  `)

  const now = new Date().toLocaleString("zh-CN", { hour12: false })
  insert.run({ id: "u1", name: "管理员", email: "admin@wufang.local", role: "admin", status: "active", lastActiveAt: now })
  insert.run({ id: "u2", name: "编辑", email: "editor@wufang.local", role: "editor", status: "active", lastActiveAt: now })
  insert.run({ id: "u3", name: "审校", email: "reviewer@wufang.local", role: "reviewer", status: "invited", lastActiveAt: now })
}

function pruneExpiredProjectLocks() {
  const threshold = Date.now() - 30 * 60 * 1000
  getDb().prepare("DELETE FROM project_locks WHERE updated_at < ?").run(threshold)
}

export function listProjects() {
  pruneExpiredProjectLocks()
  const rows = getDb().prepare("SELECT * FROM projects ORDER BY updated_at DESC").all() as Record<string, unknown>[]
  return rows.map(rowToProject)
}

export function upsertProject(project: StudioProject) {
  getDb().prepare(`
    INSERT INTO projects (
      id, name, type, platform, aspect, episodes, duration, owner, updated_at,
      progress, status, current_step, deliverables, reference_files
    ) VALUES (
      @id, @name, @type, @platform, @aspect, @episodes, @duration, @owner, @updatedAt,
      @progress, @status, @currentStep, @deliverables, @referenceFiles
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      platform = excluded.platform,
      aspect = excluded.aspect,
      episodes = excluded.episodes,
      duration = excluded.duration,
      owner = excluded.owner,
      updated_at = excluded.updated_at,
      progress = excluded.progress,
      status = excluded.status,
      current_step = excluded.current_step,
      deliverables = excluded.deliverables,
      reference_files = excluded.reference_files
  `).run({
    ...project,
    updatedAt: project.updatedAt,
    deliverables: JSON.stringify(project.deliverables ?? []),
    referenceFiles: JSON.stringify(project.referenceFiles ?? []),
  })
}

export function getProjectLock(projectId: string) {
  pruneExpiredProjectLocks()
  const row = getDb()
    .prepare("SELECT * FROM project_locks WHERE project_id = ?")
    .get(projectId) as Record<string, unknown> | undefined
  if (!row) return null
  return rowToProjectLock(row)
}

export function acquireProjectLock(projectId: string, userId: string, userName: string, role: string) {
  const now = Date.now()
  const existing = getProjectLock(projectId)
  if (existing && existing.userId !== userId) {
    return { acquired: false, lock: existing }
  }

  getDb()
    .prepare(`
      INSERT INTO project_locks (project_id, user_id, user_name, role, acquired_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET
        user_id = excluded.user_id,
        user_name = excluded.user_name,
        role = excluded.role,
        updated_at = excluded.updated_at
    `)
    .run(projectId, userId, userName, role, existing?.acquiredAt ?? now, now)

  return { acquired: true, lock: getProjectLock(projectId) }
}

export function releaseProjectLock(projectId: string, userId?: string) {
  if (!userId) {
    getDb().prepare("DELETE FROM project_locks WHERE project_id = ?").run(projectId)
    return
  }

  getDb().prepare("DELETE FROM project_locks WHERE project_id = ? AND user_id = ?").run(projectId, userId)
}

export function getWorkflowDocument(projectId: string, stepKey: string) {
  const row = getDb()
    .prepare("SELECT content FROM workflow_documents WHERE project_id = ? AND step_key = ?")
    .get(projectId, stepKey) as { content: string } | undefined
  return row?.content ?? ""
}

export function saveWorkflowDocument(projectId: string, stepKey: string, content: string) {
  const createdAt = new Date().toLocaleString("zh-CN", { hour12: false })
  const versionLabel = `v${listWorkflowDocumentVersions(projectId, stepKey).length + 1}`
  const db = getDb()
  db.prepare(`
    INSERT INTO workflow_documents (project_id, step_key, content, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(project_id, step_key) DO UPDATE SET
      content = excluded.content,
      updated_at = excluded.updated_at
  `).run(projectId, stepKey, content, createdAt)
  db.prepare(`
    INSERT INTO workflow_document_versions (project_id, step_key, version_label, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(projectId, stepKey, versionLabel, content, createdAt)
}

export function listWorkflowDocumentVersions(projectId: string, stepKey: string) {
  return getDb()
    .prepare(
      "SELECT version_label, content, created_at FROM workflow_document_versions WHERE project_id = ? AND step_key = ? ORDER BY id DESC",
    )
    .all(projectId, stepKey)
    .map((row) => {
      const item = row as Record<string, unknown>
      return {
        versionLabel: String(item.version_label),
        content: String(item.content),
        createdAt: String(item.created_at),
      }
    })
}

export function getWorkflowDocumentVersion(
  projectId: string,
  stepKey: string,
  versionLabel: string,
) {
  const row = getDb()
    .prepare(
      "SELECT content FROM workflow_document_versions WHERE project_id = ? AND step_key = ? AND version_label = ? ORDER BY id DESC LIMIT 1",
    )
    .get(projectId, stepKey, versionLabel) as { content: string } | undefined
  return row?.content ?? ""
}

export function listAssets(projectId: string) {
  return getDb()
    .prepare("SELECT * FROM assets WHERE project_id = ? ORDER BY added_at DESC")
    .all(projectId)
    .map(rowToAsset)
}

export function listWorkflowDocuments() {
  return getDb()
    .prepare("SELECT project_id, step_key, content, updated_at FROM workflow_documents ORDER BY updated_at DESC")
    .all()
    .map((row) => {
      const item = row as Record<string, unknown>
      return {
        projectId: String(item.project_id),
        stepKey: String(item.step_key),
        content: String(item.content),
        updatedAt: String(item.updated_at),
      }
    })
}

export function upsertAssets(assets: StudioAsset[]) {
  const insert = getDb().prepare(`
    INSERT INTO assets (id, project_id, name, type, size, category, added_at, file_path)
    VALUES (@id, @projectId, @name, @type, @size, @category, @addedAt, @filePath)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      size = excluded.size,
      category = excluded.category,
      added_at = excluded.added_at,
      file_path = excluded.file_path
  `)
  const tx = getDb().transaction((items: StudioAsset[]) => {
    for (const item of items) insert.run(item)
  })
  tx(assets)
}

export function replaceProjectAssets(projectId: string, assets: StudioAsset[]) {
  const db = getDb()
  const insert = db.prepare(`
    INSERT INTO assets (id, project_id, name, type, size, category, added_at, file_path)
    VALUES (@id, @projectId, @name, @type, @size, @category, @addedAt, @filePath)
  `)
  const tx = db.transaction((items: StudioAsset[]) => {
    db.prepare("DELETE FROM assets WHERE project_id = ?").run(projectId)
    for (const item of items) insert.run(item)
  })
  tx(assets)
}

export function deleteAsset(projectId: string, assetId: string) {
  getDb().prepare("DELETE FROM assets WHERE project_id = ? AND id = ?").run(projectId, assetId)
}

export function listReviewIssues() {
  return getDb()
    .prepare("SELECT * FROM review_issues ORDER BY COALESCE(created_at, '') DESC, id DESC")
    .all()
    .map(rowToReviewIssue)
}

export function listAuditEvents() {
  return getDb()
    .prepare("SELECT * FROM audit_events ORDER BY created_at DESC, id DESC")
    .all()
    .map(rowToAuditEvent)
}

export function listTeamMembers() {
  return getDb()
    .prepare("SELECT * FROM team_members ORDER BY role ASC, name ASC")
    .all()
    .map(rowToTeamMember)
}

export function listProjectLocks() {
  pruneExpiredProjectLocks()
  return getDb()
    .prepare("SELECT * FROM project_locks ORDER BY updated_at DESC")
    .all()
    .map((row) => rowToProjectLock(row as Record<string, unknown>))
}

export function saveTeamMembers(items: StudioTeamMember[]) {
  const insert = getDb().prepare(`
    INSERT INTO team_members (id, name, email, role, status, last_active_at)
    VALUES (@id, @name, @email, @role, @status, @lastActiveAt)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      role = excluded.role,
      status = excluded.status,
      last_active_at = excluded.last_active_at
  `)
  const tx = getDb().transaction((members: StudioTeamMember[]) => {
    getDb().prepare("DELETE FROM team_members").run()
    for (const member of members) insert.run(member)
  })
  tx(items)
}

export function addAuditEvent(event: StudioAuditEvent) {
  getDb().prepare(`
    INSERT INTO audit_events (id, scope, action, target, detail, actor, created_at)
    VALUES (@id, @scope, @action, @target, @detail, @actor, @createdAt)
    ON CONFLICT(id) DO UPDATE SET
      scope = excluded.scope,
      action = excluded.action,
      target = excluded.target,
      detail = excluded.detail,
      actor = excluded.actor,
      created_at = excluded.created_at
  `).run(event)
}

export function upsertReviewIssue(issue: StudioReviewIssue) {
  getDb().prepare(`
    INSERT INTO review_issues (
      id, project, project_id, location, severity, type, summary, status, reviewer, created_at
    ) VALUES (
      @id, @project, @projectId, @location, @severity, @type, @summary, @status, @reviewer, @createdAt
    )
    ON CONFLICT(id) DO UPDATE SET
      project = excluded.project,
      project_id = excluded.project_id,
      location = excluded.location,
      severity = excluded.severity,
      type = excluded.type,
      summary = excluded.summary,
      status = excluded.status,
      reviewer = excluded.reviewer,
      created_at = excluded.created_at
  `).run(issue)
}

export function updateReviewIssue(id: string, patch: Partial<StudioReviewIssue>) {
  const existing = listReviewIssues().find((issue) => issue.id === id)
  if (!existing) return
  upsertReviewIssue({ ...existing, ...patch })
}

export function listProviders() {
  const rows = getDb().prepare("SELECT * FROM providers ORDER BY enabled DESC, name ASC").all() as Record<string, unknown>[]
  return rows.map(rowToProvider)
}

export function getSetting(key: string) {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined
  return row?.value ?? ""
}

export function setSetting(key: string, value: string) {
  getDb().prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value)
}

export function getCurrentSessionSetting() {
  const value = getSetting("currentUser")
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as { userId?: string; role?: string }
    return {
      userId: parsed.userId ?? "",
      role: parsed.role ?? "viewer",
    }
  } catch {
    return null
  }
}

export function setCurrentSessionSetting(userId: string, role: string) {
  setSetting("currentUser", JSON.stringify({ userId, role }))
}

export function saveProviders(items: StudioProvider[]) {
  const insert = getDb().prepare(`
    INSERT INTO providers (
      id, name, type, base_url, api_key, text_model, long_model, vision_model,
      image_model, enabled, status, temperature, max_tokens, timeout_ms
    ) VALUES (
      @id, @name, @type, @baseUrl, @apiKey, @textModel, @longModel, @visionModel,
      @imageModel, @enabled, @status, @temperature, @maxTokens, @timeoutMs
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      base_url = excluded.base_url,
      api_key = excluded.api_key,
      text_model = excluded.text_model,
      long_model = excluded.long_model,
      vision_model = excluded.vision_model,
      image_model = excluded.image_model,
      enabled = excluded.enabled,
      status = excluded.status,
      temperature = excluded.temperature,
      max_tokens = excluded.max_tokens,
      timeout_ms = excluded.timeout_ms
  `)
  const tx = getDb().transaction((providersToSave: StudioProvider[]) => {
    getDb().prepare("DELETE FROM providers").run()
    for (const provider of providersToSave) {
      insert.run({
        ...provider,
        enabled: provider.enabled ? 1 : 0,
        temperature: provider.temperature ?? 0.7,
        maxTokens: provider.maxTokens ?? 4000,
        timeoutMs: provider.timeoutMs ?? 60000,
      })
    }
  })
  tx(items)
}

function rowToProject(row: Record<string, unknown>): StudioProject {
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type),
    platform: String(row.platform),
    aspect: String(row.aspect),
    episodes: Number(row.episodes),
    duration: String(row.duration),
    owner: String(row.owner),
    updatedAt: String(row.updated_at),
    progress: Number(row.progress),
    status: String(row.status) as StudioProject["status"],
    currentStep: String(row.current_step),
    deliverables: parseJson<string[]>(String(row.deliverables), []),
    referenceFiles: parseJson<string[]>(String(row.reference_files), []),
  }
}

function rowToProjectLock(row: Record<string, unknown>): StudioProjectLock {
  return {
    projectId: String(row.project_id),
    userId: String(row.user_id),
    userName: String(row.user_name),
    role: String(row.role),
    acquiredAt: Number(row.acquired_at),
    updatedAt: Number(row.updated_at),
  }
}

function rowToAsset(row: unknown): StudioAsset {
  const item = row as Record<string, unknown>
  return {
    id: String(item.id),
    projectId: String(item.project_id),
    name: String(item.name),
    type: String(item.type),
    size: Number(item.size),
    category: String(item.category) as StudioAsset["category"],
    addedAt: String(item.added_at),
    filePath: item.file_path ? String(item.file_path) : undefined,
  }
}

function rowToReviewIssue(row: unknown): StudioReviewIssue {
  const item = row as Record<string, unknown>
  return {
    id: String(item.id),
    project: String(item.project),
    projectId: item.project_id ? String(item.project_id) : undefined,
    location: String(item.location),
    severity: String(item.severity) as StudioReviewIssue["severity"],
    type: String(item.type),
    summary: String(item.summary),
    status: String(item.status) as StudioReviewIssue["status"],
    reviewer: String(item.reviewer),
    createdAt: item.created_at ? String(item.created_at) : undefined,
  }
}

function rowToProvider(row: Record<string, unknown>): StudioProvider {
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type),
    baseUrl: String(row.base_url),
    apiKey: row.api_key ? String(row.api_key) : "",
    textModel: String(row.text_model),
    longModel: String(row.long_model),
    visionModel: String(row.vision_model),
    imageModel: String(row.image_model),
    enabled: Boolean(row.enabled),
    status: String(row.status) as StudioProvider["status"],
    temperature: row.temperature == null ? 0.7 : Number(row.temperature),
    maxTokens: row.max_tokens == null ? 4000 : Number(row.max_tokens),
    timeoutMs: row.timeout_ms == null ? 60000 : Number(row.timeout_ms),
  }
}

function rowToAuditEvent(row: unknown): StudioAuditEvent {
  const item = row as Record<string, unknown>
  return {
    id: String(item.id),
    scope: String(item.scope),
    action: String(item.action),
    target: String(item.target),
    detail: String(item.detail),
    actor: String(item.actor),
    createdAt: String(item.created_at),
  }
}

function rowToTeamMember(row: unknown): StudioTeamMember {
  const item = row as Record<string, unknown>
  return {
    id: String(item.id),
    name: String(item.name),
    email: String(item.email),
    role: String(item.role) as StudioTeamMember["role"],
    status: String(item.status) as StudioTeamMember["status"],
    lastActiveAt: String(item.last_active_at),
  }
}

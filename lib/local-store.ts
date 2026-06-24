"use client"

import {
  providers,
  reviewIssues,
  type Project,
  type Provider,
  type ReviewIssue,
  type WorkflowStatus,
} from "@/lib/data"

export type StudioProject = Project & {
  deliverables: string[]
  referenceFiles?: string[]
}

export type StudioProvider = Provider & {
  apiKey?: string
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
}

export type StudioReviewIssue = ReviewIssue & {
  projectId?: string
  createdAt?: string
}

export type StudioAsset = {
  id: string
  projectId: string
  name: string
  type: string
  size: number
  category: "document" | "image" | "video" | "audio" | "other"
  addedAt: string
}

const keys = {
  projects: "wufang.projects",
  providers: "wufang.providers",
  activeProjectId: "wufang.activeProjectId",
  activeWorkflowStep: "wufang.activeWorkflowStep",
  documentPrefix: "wufang.document.",
  workflowDocumentPrefix: "wufang.workflowDocument.",
  reviewIssues: "wufang.reviewIssues",
  assetPrefix: "wufang.assets.",
}

export const projectTypes = ["AI漫剧", "微短剧", "IP样片", "文旅方案", "AIGC培训", "自定义"]
export const platforms = ["红果", "芒果TV", "B站", "抖音", "腾讯", "优酷", "自定义"]
export const defaultDeliverables = [
  "策划案",
  "分集大纲",
  "剧本",
  "导演讲戏",
  "分镜",
  "视觉资产",
  "审核报告",
  "资料包",
]

const defaultProjects: StudioProject[] = [
  {
    id: "qm",
    name: "《千面》",
    type: "AI漫剧",
    platform: "红果",
    aspect: "9:16 竖屏",
    episodes: 60,
    duration: "90s",
    owner: "林知远",
    updatedAt: "2026-06-22 14:20",
    progress: 72,
    status: "in-progress",
    currentStep: "分镜",
    deliverables: defaultDeliverables.slice(0, 6),
  },
]

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function normalizeProvider(provider: Provider): StudioProvider {
  return {
    ...provider,
    visionModel: provider.visionModel === "鈥?" ? "—" : provider.visionModel,
    imageModel: provider.imageModel === "鈥?" ? "—" : provider.imageModel,
    apiKey: "",
    temperature: 0.7,
    maxTokens: 4000,
    timeoutMs: 60000,
  }
}

export function getStoredProjects(): StudioProject[] {
  return readJson<StudioProject[]>(keys.projects, defaultProjects)
}

export function saveStoredProjects(value: StudioProject[]) {
  writeJson(keys.projects, value)
}

export function upsertStoredProject(project: StudioProject) {
  const existing = getStoredProjects()
  const next = [project, ...existing.filter((item) => item.id !== project.id)]
  saveStoredProjects(next)
  setActiveProjectId(project.id)
}

export function updateStoredProject(id: string, patch: Partial<StudioProject>) {
  const existing = getStoredProjects()
  const next = existing.map((project) =>
    project.id === id ? { ...project, ...patch } : project,
  )
  saveStoredProjects(next)
  window.dispatchEvent(new CustomEvent("wufang:projects-change", { detail: id }))
  return next.find((project) => project.id === id)
}

export function updateProjectWorkflow(
  id: string,
  stepLabel: string,
  progress: number,
  status: WorkflowStatus = "in-progress",
) {
  return updateStoredProject(id, {
    currentStep: stepLabel,
    progress: Math.max(0, Math.min(100, Math.round(progress))),
    status,
    updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
  })
}

export function getActiveProjectId() {
  if (typeof window === "undefined") return defaultProjects[0].id
  return window.localStorage.getItem(keys.activeProjectId) ?? getStoredProjects()[0]?.id ?? defaultProjects[0].id
}

export function setActiveProjectId(id: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(keys.activeProjectId, id)
  window.dispatchEvent(new CustomEvent("wufang:active-project-change", { detail: id }))
}

export function getActiveProject() {
  const projects = getStoredProjects()
  const activeId = getActiveProjectId()
  return projects.find((project) => project.id === activeId) ?? projects[0] ?? defaultProjects[0]
}

export function getActiveWorkflowStep() {
  if (typeof window === "undefined") return "proposal"
  return window.localStorage.getItem(keys.activeWorkflowStep) ?? "proposal"
}

export function setActiveWorkflowStep(step: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(keys.activeWorkflowStep, step)
}

export function getStoredProviders(): StudioProvider[] {
  return readJson<StudioProvider[]>(keys.providers, providers.map(normalizeProvider))
}

export function saveStoredProviders(value: StudioProvider[]) {
  writeJson(keys.providers, value)
  window.dispatchEvent(new CustomEvent("wufang:providers-change"))
}

export function getDefaultTextProvider() {
  return getStoredProviders().find((provider) => provider.enabled && provider.textModel && provider.textModel !== "—")
}

export function getStoredDocument(projectId: string, fallback: string) {
  return readJson<string>(`${keys.documentPrefix}${projectId}`, fallback)
}

export function saveStoredDocument(projectId: string, content: string) {
  writeJson(`${keys.documentPrefix}${projectId}`, content)
}

function getWorkflowDocumentKey(projectId: string, step: string) {
  return `${keys.workflowDocumentPrefix}${projectId}.${step}`
}

export function getStoredWorkflowDocument(projectId: string, step: string, fallback: string) {
  const legacyFallback = step === "proposal" ? getStoredDocument(projectId, fallback) : fallback
  return readJson<string>(getWorkflowDocumentKey(projectId, step), legacyFallback)
}

export function saveStoredWorkflowDocument(projectId: string, step: string, content: string) {
  writeJson(getWorkflowDocumentKey(projectId, step), content)
  if (step === "proposal") saveStoredDocument(projectId, content)
}

export function getStoredReviewIssues(): StudioReviewIssue[] {
  return readJson<StudioReviewIssue[]>(keys.reviewIssues, reviewIssues)
}

export function saveStoredReviewIssues(value: StudioReviewIssue[]) {
  writeJson(keys.reviewIssues, value)
}

export function addStoredReviewIssue(issue: StudioReviewIssue) {
  const existing = getStoredReviewIssues()
  const next = [issue, ...existing.filter((item) => item.id !== issue.id)]
  saveStoredReviewIssues(next)
  window.dispatchEvent(new CustomEvent("wufang:review-issues-change", { detail: issue.id }))
  return issue
}

export function updateStoredReviewIssue(id: string, patch: Partial<StudioReviewIssue>) {
  const next = getStoredReviewIssues().map((issue) =>
    issue.id === id ? { ...issue, ...patch } : issue,
  )
  saveStoredReviewIssues(next)
  window.dispatchEvent(new CustomEvent("wufang:review-issues-change", { detail: id }))
}

function getProjectAssetKey(projectId: string) {
  return `${keys.assetPrefix}${projectId}`
}

export function getStoredAssets(projectId: string): StudioAsset[] {
  return readJson<StudioAsset[]>(getProjectAssetKey(projectId), [])
}

export function saveStoredAssets(projectId: string, value: StudioAsset[]) {
  writeJson(getProjectAssetKey(projectId), value)
  window.dispatchEvent(new CustomEvent("wufang:assets-change", { detail: projectId }))
}

function getAssetCategory(file: File): StudioAsset["category"] {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/")) return "video"
  if (file.type.startsWith("audio/")) return "audio"
  if (
    file.type.includes("pdf") ||
    file.type.includes("word") ||
    file.type.includes("text") ||
    /\.(pdf|docx?|txt|md)$/i.test(file.name)
  ) {
    return "document"
  }
  return "other"
}

export function addStoredAssets(projectId: string, files: File[]) {
  const existing = getStoredAssets(projectId)
  const addedAt = new Date().toLocaleString("zh-CN", { hour12: false })
  const nextAssets = files.map((file) => ({
    id: `${projectId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    projectId,
    name: file.name,
    type: file.type || "unknown",
    size: file.size,
    category: getAssetCategory(file),
    addedAt,
  }))
  const next = [...nextAssets, ...existing]
  saveStoredAssets(projectId, next)
  return nextAssets
}

export function removeStoredAsset(projectId: string, assetId: string) {
  const next = getStoredAssets(projectId).filter((asset) => asset.id !== assetId)
  saveStoredAssets(projectId, next)
}

export function createProjectId(name: string) {
  const slug = name
    .trim()
    .replace(/[《》、“”"'`~!@#$%^&*()+=[\]{}\\|;:,.<>/?，。！？、\s]/g, "")
    .toLowerCase()
    .slice(0, 24)
  return `${slug || "project"}-${Date.now().toString(36)}`
}

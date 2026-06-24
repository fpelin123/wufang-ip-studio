"use client"

import { providers, type Project, type Provider } from "@/lib/data"

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

const keys = {
  projects: "wufang.projects",
  providers: "wufang.providers",
  activeProjectId: "wufang.activeProjectId",
  documentPrefix: "wufang.document.",
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

export function getStoredProviders(): StudioProvider[] {
  return readJson<StudioProvider[]>(keys.providers, providers.map(normalizeProvider))
}

export function saveStoredProviders(value: StudioProvider[]) {
  writeJson(keys.providers, value)
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

export function createProjectId(name: string) {
  const slug = name
    .trim()
    .replace(/[《》、“”"'`~!@#$%^&*()+=[\]{}\\|;:,.<>/?，。！？、\s]/g, "")
    .toLowerCase()
    .slice(0, 24)
  return `${slug || "project"}-${Date.now().toString(36)}`
}

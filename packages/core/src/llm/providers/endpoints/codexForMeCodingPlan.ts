/**
 * TTAPI CodingPlan 中转站
 *
 * - 官网：https://w.ciykj.cn/
 * - 控制台：https://w.ciykj.cn/login
 * - API 入口：https://w.ciykj.cn/v1
 *
 * TTAPI 是 OpenAI-compatible 中转站，站点公开入口为 https://w.ciykj.cn，
 * InkOS provider bank 里使用带 /v1 的 baseUrl，以便内部 OpenAI Responses
 * 客户端正确拼接 /responses 和 /models 路径。
 */
import type { InkosEndpoint } from "../types.js";

export const CODEX_FOR_ME_CODING_PLAN: InkosEndpoint = {
  id: "codexForMeCodingPlan",
  label: "Codex CodingPlan 中转站 (TTAPI)",
  group: "codingPlan",
  api: "openai-responses",
  baseUrl: "https://w.ciykj.cn/v1",
  modelsBaseUrl: "https://w.ciykj.cn/v1",
  checkModel: "gpt-5.4",
  transportDefaults: { apiFormat: "responses", stream: false },
  temperatureRange: [0, 2],
  defaultTemperature: 1,
  writingTemperature: 1,
  models: [
    { id: "gpt-5.5", maxOutput: 128000, contextWindowTokens: 1050000, enabled: true },
    { id: "gpt-5.4", maxOutput: 128000, contextWindowTokens: 1050000, enabled: true, releasedAt: "2026-03-05" },
    { id: "gpt-5.4-pro", maxOutput: 128000, contextWindowTokens: 1050000, releasedAt: "2026-03-05" },
    { id: "gpt-5.4-mini", maxOutput: 128000, contextWindowTokens: 400000, enabled: true, releasedAt: "2026-03-18" },
    { id: "gpt-5.4-nano", maxOutput: 128000, contextWindowTokens: 400000, releasedAt: "2026-03-18" },
    { id: "gpt-5.3-codex", maxOutput: 128000, contextWindowTokens: 400000, enabled: true, releasedAt: "2026-02-05" },
    { id: "gpt-5.3-codex-spark", maxOutput: 128000, contextWindowTokens: 400000, enabled: true, releasedAt: "2026-02-05" },
    { id: "gpt-5.2-codex", maxOutput: 128000, contextWindowTokens: 400000, releasedAt: "2025-12-18" },
    { id: "gpt-5.1-codex-max", maxOutput: 128000, contextWindowTokens: 400000, releasedAt: "2025-12-04" },
    { id: "gpt-5.1-codex", maxOutput: 128000, contextWindowTokens: 400000, releasedAt: "2025-11-13" },
    { id: "gpt-5.1-codex-mini", maxOutput: 128000, contextWindowTokens: 400000, releasedAt: "2025-11-13" },
    { id: "gpt-5-codex", maxOutput: 128000, contextWindowTokens: 400000, releasedAt: "2024-09-15" },
  ],
};

/**
 * Codex-for.me Coding Plan
 *
 * - 官网：https://codex-for.me/
 * - 文档：https://docs.codex-for.me/
 * - API 入口：https://api-vip.codex-for.me/v1
 *
 * Codex-for.me 提供面向 Codex / OpenAI Responses 兼容客户端的编码订阅入口。
 * inkos 走 OpenAI Responses 协议接入，避免用户把它配置成 custom 后还要手动选择
 * responses + 非流式 transport。
 */
import type { InkosEndpoint } from "../types.js";

export const CODEX_FOR_ME_CODING_PLAN: InkosEndpoint = {
  id: "codexForMeCodingPlan",
  label: "Codex-for.me Coding Plan",
  group: "codingPlan",
  api: "openai-responses",
  baseUrl: "https://api-vip.codex-for.me/v1",
  modelsBaseUrl: "https://api-vip.codex-for.me/v1",
  checkModel: "gpt-5.4",
  transportDefaults: { apiFormat: "responses", stream: false },
  temperatureRange: [0, 2],
  defaultTemperature: 1,
  writingTemperature: 1,
  models: [
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

/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ConcreteNode } from '../graph/types.js';
import type { ContextEnvironment } from '../pipeline/environment.js';
import { LlmRole } from '../../telemetry/llmRole.js';
import { formatNodesForLlm } from './formatNodesForLlm.js';

export class SnapshotGenerator {
  constructor(private readonly env: ContextEnvironment) {}

  async synthesizeSnapshot(
    nodes: readonly ConcreteNode[],
    systemInstruction?: string,
  ): Promise<string> {
    const systemPrompt =
      systemInstruction ??
      `You are an expert Context Memory Manager. You will be provided with a raw transcript of older conversation turns between a "user" and a "model" (the AI assistant).
Your task is to synthesize these turns into a dense, highly structured XML snapshot.

You MUST follow this exact XML schema. Do not use markdown blocks outside the XML.

<snapshot>
  <active_tasks>
    (List any tasks, goals, or requests from the user that remain unresolved or active. Be specific.)
  </active_tasks>
  <discovered_facts>
    (List explicit empirical facts discovered during the session. YOU MUST PRESERVE specific file paths, symbol names, error codes, and configuration values. Do not abstract them away.)
  </discovered_facts>
  <constraints_and_preferences>
    (List any specific rules or instructions the user provided during this session, e.g., "do not modify tests yet".)
  </constraints_and_preferences>
  <summary>
    (A very brief 1-2 sentence chronological summary of what occurred in the transcript.)
  </summary>
</snapshot>`;

    const userPromptText = 'TRANSCRIPT TO SNAPSHOT:\n\n' + formatNodesForLlm(nodes);

    const response = await this.env.llmClient.generateContent({
      role: LlmRole.UTILITY_STATE_SNAPSHOT_PROCESSOR,
      modelConfigKey: { model: 'gemini-3-flash-base' },
      contents: [{ role: 'user', parts: [{ text: userPromptText }] }],
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      promptId: this.env.promptId,
      abortSignal: new AbortController().signal,
    });

    const candidate = response.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0];
    return textPart?.text || '';
  }
}

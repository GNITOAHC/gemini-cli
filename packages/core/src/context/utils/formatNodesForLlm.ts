/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ConcreteNode } from '../graph/types.js';

export interface FormatNodesOptions {
  /**
   * The maximum number of characters to retain from a tool response.
   * Tool responses larger than this will be truncated to preserve LLM attention span
   * and avoid context limits during summarization operations.
   * Defaults to 2000.
   */
  maxToolResponseChars?: number;
}

/**
 * Formats a sequence of Context Graph nodes into a dense, human/LLM-readable text transcript.
 * This is used by summarization processors (like SnapshotGenerator and RollingSummaryProcessor)
 * to serialize the graph before passing it to an LLM.
 */
export function formatNodesForLlm(
  nodes: readonly ConcreteNode[],
  options: FormatNodesOptions = {},
): string {
  const maxToolChars = options.maxToolResponseChars ?? 2000;
  let transcript = '';

  for (const node of nodes) {
    const payload = node.payload;
    let nodeContent = '';

    if (payload.text) {
      nodeContent = payload.text;
    } else if (payload.functionCall) {
      nodeContent = `CALL: ${payload.functionCall.name}(${JSON.stringify(payload.functionCall.args)})`;
    } else if (payload.functionResponse) {
      const rawResponse = JSON.stringify(payload.functionResponse.response);
      if (rawResponse.length > maxToolChars) {
        const half = Math.floor(maxToolChars / 2);
        const truncatedCount = rawResponse.length - maxToolChars;
        nodeContent = `RESPONSE: ${rawResponse.substring(0, half)}... [TRUNCATED ${truncatedCount} chars] ...${rawResponse.substring(rawResponse.length - half)}`;
      } else {
        nodeContent = `RESPONSE: ${rawResponse}`;
      }
    } else {
      // Fallback for unexpected node shapes
      nodeContent = JSON.stringify(payload);
    }

    const role = (node.role || 'system').toUpperCase();
    transcript += `[${role}] [${node.type}]: ${nodeContent}\n`;
  }

  return transcript;
}

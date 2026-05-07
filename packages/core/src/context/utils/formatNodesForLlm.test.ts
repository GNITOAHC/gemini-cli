/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { formatNodesForLlm } from './formatNodesForLlm.js';
import { NodeType, type ConcreteNode } from '../graph/types.js';

describe('formatNodesForLlm', () => {
  it('should format standard user and model text messages', () => {
    const nodes: ConcreteNode[] = [
      {
        id: '1',
        turnId: '1',
        type: NodeType.USER_PROMPT,
        timestamp: 1000,
        role: 'user',
        payload: { text: 'Hello AI' },
      },
      {
        id: '2',
        turnId: '2',
        type: NodeType.AGENT_THOUGHT,
        timestamp: 1001,
        role: 'model',
        payload: { text: 'Hello User' },
      },
    ];

    const result = formatNodesForLlm(nodes);
    expect(result).toContain('[USER] [USER_PROMPT]: Hello AI');
    expect(result).toContain('[MODEL] [AGENT_THOUGHT]: Hello User');
  });

  it('should format tool calls correctly', () => {
    const nodes: ConcreteNode[] = [
      {
        id: '1',
        turnId: '1',
        type: NodeType.TOOL_EXECUTION,
        timestamp: 1000,
        role: 'model',
        payload: {
          functionCall: { name: 'run_cmd', args: { cmd: 'ls' } },
        },
      },
    ];

    const result = formatNodesForLlm(nodes);
    expect(result).toContain('[MODEL] [TOOL_EXECUTION]: CALL: run_cmd({"cmd":"ls"})');
  });

  it('should format tool responses correctly', () => {
    const nodes: ConcreteNode[] = [
      {
        id: '1',
        turnId: '1',
        type: NodeType.TOOL_EXECUTION,
        timestamp: 1000,
        role: 'user',
        payload: {
          functionResponse: {
            name: 'run_cmd',
            response: { output: 'file.txt' },
          },
        },
      },
    ];

    const result = formatNodesForLlm(nodes);
    expect(result).toContain('[USER] [TOOL_EXECUTION]: RESPONSE: {"output":"file.txt"}');
  });

  it('should truncate massive tool responses', () => {
    // Generate a 3000 character string (exceeds the default 2000 limit)
    const massiveOutput = 'A'.repeat(1500) + 'B'.repeat(1500);
    
    const nodes: ConcreteNode[] = [
      {
        id: '1',
        turnId: '1',
        type: NodeType.TOOL_EXECUTION,
        timestamp: 1000,
        role: 'user',
        payload: {
          functionResponse: {
            name: 'read_file',
            response: { output: massiveOutput },
          },
        },
      },
    ];

    const result = formatNodesForLlm(nodes, { maxToolResponseChars: 2000 });
    
    // The exact JSON string will be slightly longer because of {"output":""} wrapper
    // The output should contain the beginning of the A's and the end of the B's
    expect(result).toContain('RESPONSE: {"output":"AAAA');
    expect(result).toContain('[TRUNCATED');
    expect(result).toContain('chars] ...BBBB');
    expect(result.length).toBeLessThan(2500); // Ensure it was actually truncated
  });

  it('should fallback to SYSTEM role if role is undefined', () => {
    const nodes: ConcreteNode[] = [
      {
        id: '1',
        turnId: '1',
        type: NodeType.SNAPSHOT,
        timestamp: 1000,
        // @ts-expect-error testing undefined role
        role: undefined,
        payload: { text: 'Summary of past' },
      },
    ];

    const result = formatNodesForLlm(nodes);
    expect(result).toContain('[SYSTEM] [SNAPSHOT]: Summary of past');
  });
});

import { describe, it, expect } from 'vitest';
import {
  detectLanguage, formatJson, minifyJson, jsonToCsv, textStats,
  compareLines, decodeUrl, base64Encode, base64Decode, decodeJwtPayload
} from './devtools.js';

describe('DevForge developer utilities', () => {
  it('detects common source languages', () => {
    expect(detectLanguage('main.ts')).toBe('typescript');
    expect(detectLanguage('main.cpp')).toBe('cpp');
    expect(detectLanguage('file.unknown')).toBe('plaintext');
  });

  it('formats and minifies valid JSON', () => {
    expect(formatJson('{"a":1}')).toContain('\n');
    expect(minifyJson('{ "a": 1 }')).toBe('{"a":1}');
  });

  it('rejects invalid JSON', () => {
    expect(() => formatJson('{oops')).toThrow();
  });

  it('exports object arrays to escaped CSV', () => {
    expect(jsonToCsv('[{"name":"A, B","n":2}]')).toBe('name,n\r\n"A, B",2');
    expect(jsonToCsv('[]')).toBe('');
  });

  it('counts text accurately across line endings', () => {
    expect(textStats('hi there\nfriend')).toEqual({
      characters: 15, charactersNoWhitespace: 13, words: 3, lines: 2
    });
    expect(textStats('')).toEqual({
      characters: 0, charactersNoWhitespace: 0, words: 0, lines: 0
    });
  });

  it('compares lines without losing changes', () => {
    expect(compareLines('a\nb', 'a\nc').map(row => row.type)).toEqual(['same', 'removed', 'added']);
  });

  it('can ignore case and whitespace when comparing', () => {
    expect(compareLines('Hello World', 'helloworld', { ignoreCase: true, ignoreWhitespace: true })[0].type).toBe('same');
  });

  it('decodes URL and Base64 text', () => {
    expect(decodeUrl('hello%20world')).toBe('hello world');
    expect(base64Decode(base64Encode('DevForge ✓'))).toBe('DevForge ✓');
  });

  it('decodes JWT payload without claiming to verify signatures', () => {
    const payload = btoa(JSON.stringify({ sub: '123', admin: false })).replace(/=/g, '');
    expect(decodeJwtPayload('header.' + payload + '.signature')).toEqual({ sub: '123', admin: false });
    expect(() => decodeJwtPayload('not-a-jwt')).toThrow();
  });
});

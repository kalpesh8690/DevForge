import { describe,it,expect } from 'vitest';
import {detectLanguage,formatJson,minifyJson,jsonToCsv,textStats,compareLines,decodeUrl} from './devtools.js';
describe('DevForge developer utilities',()=>{
 it('detects common source languages',()=>{expect(detectLanguage('main.ts')).toBe('typescript');expect(detectLanguage('file.unknown')).toBe('plaintext')});
 it('formats and minifies valid JSON',()=>{expect(formatJson('{"a":1}')).toContain('\\n');expect(minifyJson('{ "a": 1 }')).toBe('{"a":1}')});
 it('rejects invalid JSON',()=>{expect(()=>formatJson('{oops')).toThrow()});
 it('exports object arrays to escaped CSV',()=>{expect(jsonToCsv('[{"name":"A, B","n":2}]')).toBe('name,n\\r\\n"A, B",2')});
 it('counts text accurately',()=>{expect(textStats('hi there\\nfriend')).toEqual({characters:15,charactersNoWhitespace:13,words:3,lines:2})});
 it('compares lines without losing changes',()=>{expect(compareLines('a\\nb','a\\nc').map(x=>x.type)).toEqual(['same','removed','added'])});
 it('decodes URL encoding',()=>{expect(decodeUrl('hello%20world')).toBe('hello world')});
});

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const lessonTypes = join(src, 'lessons', 'types.ts');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.[cm]?[jt]sx?$/.test(name) ? [path] : [];
  });
}

/** Every module specifier a file imports, re-exports, or loads dynamically. */
function specifiers(code: string): string[] {
  const patterns = [
    /\b(?:import|export)\s[^'"]*?\sfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    /\brequire\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    /\bimport\.meta\.glob\s*\(/g,
  ];
  return patterns.flatMap((re) => [...code.matchAll(re)].map((m) => m[1] ?? 'import.meta.glob'));
}

function resolveSpecifier(from: string, spec: string): string {
  if (!spec.startsWith('.')) return spec;
  const path = resolve(dirname(from), spec);
  if (path.endsWith('.ts')) return path;
  return existsSync(path) && statSync(path).isDirectory() ? join(path, 'index.ts') : `${path}.ts`;
}

/** Lesson files may import only src/lessons/types.ts; types.ts imports nothing. */
export function forbiddenLessonImports(file: string, code: string): string[] {
  return specifiers(code).filter((spec) => file === lessonTypes || resolveSpecifier(file, spec) !== lessonTypes);
}

function layerOf(path: string): string {
  return relative(src, path).split(/[\\/]/)[0] ?? '';
}

const allowedLayers: Record<string, string[]> = {
  ui: ['ui', 'engine', 'lessons', 'styles'],
  engine: ['engine', 'scene', 'lessons'],
  scene: ['scene', 'lessons'],
};

describe('import rules', () => {
  it('lessons import nothing but src/lessons/types.ts', () => {
    const problems = files(join(src, 'lessons')).flatMap((file) =>
      forbiddenLessonImports(file, readFileSync(file, 'utf8')).map((spec) => `${relative(root, file)} imports ${spec}`),
    );
    expect(problems).toEqual([]);
  });

  it('flags a lesson that imports engine code', () => {
    const file = join(src, 'lessons', 'spring-boot', 'example.ts');
    const code = "import type { Lesson } from '../types';\nimport { Player } from '../../engine/player';\n";
    expect(forbiddenLessonImports(file, code)).toEqual(['../../engine/player']);
  });

  it('engine, scene, and ui follow ui → engine → scene', () => {
    const problems: string[] = [];
    for (const [layer, allowed] of Object.entries(allowedLayers)) {
      for (const file of files(join(src, layer))) {
        for (const spec of specifiers(readFileSync(file, 'utf8'))) {
          if (!spec.startsWith('.')) continue;
          const target = layerOf(resolveSpecifier(file, spec));
          const isLessonTypes = resolveSpecifier(file, spec) === lessonTypes;
          // Only the ui registry may load lesson data; engine and scene read lesson types only.
          if (!allowed.includes(target) || (target === 'lessons' && layer !== 'ui' && !isLessonTypes)) {
            problems.push(`${relative(root, file)} imports ${spec}`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

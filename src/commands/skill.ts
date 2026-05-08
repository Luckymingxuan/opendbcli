import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);
const CURRENT_DIR = path.dirname(CURRENT_FILE_PATH);
const SKILLS_SOURCE_DIR = path.resolve(CURRENT_DIR, '..', '..', 'skills');
const SKILL_SOURCE_PATH = path.resolve(CURRENT_DIR, '..', '..', 'skills', 'SKILL.md');

interface SkillOptions {
  output?: string;
}

async function copyDirectoryRecursive(sourceDir: string, targetDir: string): Promise<void> {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectoryRecursive(sourcePath, targetPath);
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

export async function skill(options: SkillOptions): Promise<void> {
  let skillContent: string;

  try {
    skillContent = await fs.readFile(SKILL_SOURCE_PATH, 'utf-8');
  } catch {
    console.error(`Skill source not found: ${SKILL_SOURCE_PATH}`);
    process.exit(1);
  }

  if (options.output) {
    const destinationRoot = path.resolve(process.cwd(), options.output);
    await fs.mkdir(destinationRoot, { recursive: true });
    const bundleTargetPath = path.join(destinationRoot, 'dbcli-skills');
    await copyDirectoryRecursive(SKILLS_SOURCE_DIR, bundleTargetPath);
    console.log(`Skills exported to ${bundleTargetPath}`);
    return;
  }

  console.log(skillContent);
}

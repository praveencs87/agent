import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

/**
 * Version bump and changelog for self-generated skills
 */
export async function bumpVersion(
    skillDir: string,
    bumpType: 'patch' | 'minor' | 'major' = 'patch'
): Promise<string> {
    const manifestPath = path.join(skillDir, 'skill.json');
    const content = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    const [major, minor, patch] = manifest.version.split('.').map(Number);
    let newVersion: string;

    switch (bumpType) {
        case 'major':
            newVersion = `${major + 1}.0.0`;
            break;
        case 'minor':
            newVersion = `${major}.${minor + 1}.0`;
            break;
        case 'patch':
        default:
            newVersion = `${major}.${minor}.${patch + 1}`;
            break;
    }

    manifest.version = newVersion;
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

    // Update changelog
    const changelogPath = path.join(skillDir, 'CHANGELOG.md');
    const date = new Date().toISOString().split('T')[0];
    const entry = `\n## ${newVersion} (${date})\n\n- Version bump\n`;

    try {
        await access(changelogPath);
        const existing = await readFile(changelogPath, 'utf-8');
        await writeFile(changelogPath, entry + existing, 'utf-8');
    } catch {
        await writeFile(changelogPath, `# Changelog\n${entry}`, 'utf-8');
    }

    return newVersion;
}

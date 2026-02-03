import { inspectLovableProject } from './migration/inspectors/project-inspector.ts';
import fs from 'fs';

const projectPath = 'c:/Users/hugop/Repositories/aurea-1mb';
const outputPath = './migration/output/inspection.json';

console.log('Iniciando inspección...');
console.log('Proyecto:', projectPath);
console.log('Salida:', outputPath);

try {
  const inspection = await inspectLovableProject(projectPath);
  console.log('Escribiendo archivo...');
  fs.writeFileSync(outputPath, JSON.stringify(inspection, null, 2));
  console.log(' Completado');
} catch (error) {
  console.error(' Error:', error);
  process.exit(1);
}

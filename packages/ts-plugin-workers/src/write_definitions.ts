import { WorkerBindingGenerator } from '@timsexperiments/ts-plugin-workers-wasm';
import fs from 'fs';
import path from 'path';
import ts from 'typescript/lib/typescript';

export function writeDefinitions(
  project: ts.server.Project,
  generator: WorkerBindingGenerator,
  configFile: string,
  outFileName: string,
) {
  const logger = project.projectService.logger;

  let contentBuffer;
  try {
    contentBuffer = fs.readFileSync(configFile);
  } catch (e) {
    logger.info(`Unable to read the config file '${configFile}'. ${e}`);
  }
  const contents = new TextDecoder().decode(contentBuffer || Buffer.from([]));

  let result;
  try {
    result = generator.generate_definitions(contents);
  } catch (e) {
    logger.info('An error ocurrecd while generating the definitions: ' + e);
    return;
  }
  if (result.should_update()) {
    const outFile = path.resolve(project.getCurrentDirectory(), outFileName);
    try {
      fs.writeFileSync(outFile, result.definitions() + '\n\nexport {};');
    } catch (e) {
      logger.info('An error ocurrecd wile running the wasm module - ' + e);
    }
  }
}

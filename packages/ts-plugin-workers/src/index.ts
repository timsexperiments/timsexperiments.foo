import { WorkerBindingGenerator } from '@timsexperiments/ts-plugin-workers-wasm';
import fs from 'fs';
import path from 'path';
import ts from 'typescript/lib/tsserverlibrary';
import { writeDefinitions } from './write_definitions';

type Config = {
  config: string;
  out: string;
  person: string;
};

function init(modules: { typescript: typeof ts }) {
  const ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {
    const project = info.project;
    const { config = 'wrangler.toml', out = 'bindings.d.ts' } =
      info.config as Config;

    const configFile = path.resolve(project.getCurrentDirectory(), config);
    const generator = new WorkerBindingGenerator();
    writeDefinitions(project, generator, configFile, out);
    fs.watch(configFile, (event, _) => {
      if (event === 'change') {
        writeDefinitions(project, generator, configFile, out);
      }
    });

    const proxy: ts.LanguageService = Object.create(null);

    return proxy;
  }

  return { create };
}

export = init;

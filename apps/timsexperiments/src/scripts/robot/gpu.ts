import { z } from 'zod';

export const modelIds = {
  f16: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
  f32: 'SmolLM2-360M-Instruct-q4f32_1-MLC',
} as const;

function object(value: unknown): object {
  if (typeof value !== 'object' || value === null)
    throw new Error(
      'No compatible GPU was available. Published evidence still works.'
    );
  return value;
}

/** Keep native method receivers intact without requiring ambient WebGPU types. */
export async function selectGpuModel(gpu: unknown) {
  const api = object(gpu);
  const requestAdapter: unknown = Reflect.get(api, 'requestAdapter');
  if (typeof requestAdapter !== 'function')
    throw new Error(
      'This browser does not support WebGPU. Published evidence still works.'
    );
  const adapter: unknown = await Reflect.apply(requestAdapter, api, []);
  const device = object(adapter);
  const limits = object(Reflect.get(device, 'limits'));
  const bufferSize = z
    .number()
    .parse(Reflect.get(limits, 'maxStorageBufferBindingSize'));
  if (bufferSize < 128 * 1024 * 1024)
    throw new Error(
      'This GPU has insufficient buffer capacity for the local model.'
    );
  const features = object(Reflect.get(device, 'features'));
  const has: unknown = Reflect.get(features, 'has');
  if (typeof has !== 'function')
    throw new Error('This browser cannot check required GPU features.');
  const f16 = z.boolean().parse(Reflect.apply(has, features, ['shader-f16']));
  return f16 ? modelIds.f16 : modelIds.f32;
}

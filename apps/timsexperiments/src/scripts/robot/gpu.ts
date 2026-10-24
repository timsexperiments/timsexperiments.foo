import { z } from 'zod';

import { localModel } from './model';

function object(value: unknown): object {
  if (typeof value !== 'object' || value === null)
    throw new Error(
      "No compatible GPU was available. Read Tim's work or contact him below."
    );
  return value;
}

/** Keep native method receivers intact without requiring ambient WebGPU types. */
export async function selectGpuModel(gpu: unknown) {
  const api = object(gpu);
  const requestAdapter: unknown = Reflect.get(api, 'requestAdapter');
  if (typeof requestAdapter !== 'function')
    throw new Error(
      "This browser does not support WebGPU. Read Tim's work or contact him below."
    );
  const adapter: unknown = await Reflect.apply(requestAdapter, api, []);
  const device = object(adapter);
  const limits = object(Reflect.get(device, 'limits'));
  const bufferSize = z
    .number()
    .parse(Reflect.get(limits, 'maxStorageBufferBindingSize'));
  if (bufferSize < 256 * 1024 * 1024)
    throw new Error(
      'This GPU has insufficient buffer capacity for the local model.'
    );
  const features = object(Reflect.get(device, 'features'));
  const has: unknown = Reflect.get(features, 'has');
  if (typeof has !== 'function')
    throw new Error('This browser cannot check required GPU features.');
  const f16 = z.boolean().parse(Reflect.apply(has, features, ['shader-f16']));
  if (!f16)
    throw new Error(
      'This GPU lacks shader-f16. The f32 model is unverified and will not download. Read Tim’s work or contact him below.'
    );
  return localModel.id;
}

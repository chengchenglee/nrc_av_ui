import * as fs from 'fs';
import { injectable } from 'inversify';
import { IFileSystem } from '../../inversify/interfaces';

@injectable()
export default class FileSystemService implements IFileSystem {
  readFileSync(
    path: fs.PathOrFileDescriptor,
    options?:
      | (fs.ObjectEncodingOptions & {
          flag?: string | undefined;
        })
      // eslint-disable-next-line no-undef
      | BufferEncoding
      | null
  ): string | Buffer {
    return fs.readFileSync(path, options);
  }

  writeFile(
    file: fs.PathOrFileDescriptor,
    // eslint-disable-next-line no-undef
    data: string | NodeJS.ArrayBufferView,
    options: fs.WriteFileOptions,
    callback: fs.NoParamCallback
  ): void {
    fs.writeFile(file, data, options, callback);
  }

  existsSync(path: fs.PathLike): boolean {
    return fs.existsSync(path);
  }

  copyFileSync(src: fs.PathLike, dest: fs.PathLike, mode?: number | undefined): void {
    fs.copyFileSync(src, dest, mode);
  }

  mkdirSync(
    path: fs.PathLike,
    options?:
      | fs.Mode
      | (fs.MakeDirectoryOptions & {
          recursive?: false | undefined;
        })
      | null
  ): void {
    fs.mkdirSync(path, options);
  }
}

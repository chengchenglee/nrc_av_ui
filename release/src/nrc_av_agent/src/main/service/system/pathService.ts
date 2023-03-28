import * as path from 'path';
import { injectable } from 'inversify';
import { IPath } from 'src/main/inversify/interfaces';

@injectable()
export default class PathService implements IPath {
  join(...paths: string[]): string {
    return path.join(...paths);
  }

  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }
}

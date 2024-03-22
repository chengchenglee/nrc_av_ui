export default class MutexMap<K, V> {
  private map: Map<K, V>;

  private locked: boolean;

  constructor(initialMap: Map<K, V> = new Map()) {
    this.map = new Map(initialMap);
    this.locked = false;
  }

  async set(key: K, value: V): Promise<void> {
    while (this.locked) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }
    this.locked = true;
    this.map.set(key, value);
    this.locked = false;
  }

  async delete(key: K): Promise<boolean> {
    while (this.locked) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }
    this.locked = true;
    const result = this.map.delete(key);
    this.locked = false;
    return result;
  }

  async get(key: K): Promise<V | undefined> {
    while (this.locked) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }
    this.locked = true;
    const result = this.map.get(key);
    this.locked = false;
    return result;
  }

  async has(key: K): Promise<boolean> {
    while (this.locked) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }
    this.locked = true;
    const result = this.map.has(key);
    this.locked = false;
    return result;
  }

  async clear(): Promise<void> {
    while (this.locked) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }
    this.locked = true;
    this.map.clear();
    this.locked = false;
  }

  async forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void): Promise<void> {
    while (this.locked) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }
    this.locked = true;
    this.map.forEach(callbackfn);
    this.locked = false;
  }
}

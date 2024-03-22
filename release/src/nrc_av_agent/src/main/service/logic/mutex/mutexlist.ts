export default class MutexList<T> {
  private list: T[];

  private locked: boolean;

  constructor(initialList: T[] = []) {
    this.list = initialList;
    this.locked = false;
  }

  async add(item: T): Promise<void> {
    while (this.locked) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }
    this.locked = true;
    if (!this.list.includes(item)) {
      this.list.push(item);
    }
    this.locked = false;
  }

  async remove(item: T): Promise<void> {
    while (this.locked) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }
    this.locked = true;
    this.list = this.list.filter((existingItem) => existingItem !== item);
    this.locked = false;
  }

  async contains(item: T): Promise<boolean> {
    while (this.locked) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }
    this.locked = true;
    const result = this.list.includes(item);
    this.locked = false;
    return result;
  }
}

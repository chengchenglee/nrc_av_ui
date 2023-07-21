export const removeObjectKey = (data: any, keys: string[]) => {
  if (data instanceof Array) {
    data.forEach((item) => {
      removeObjectKey(item, keys);
    });
  } else if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([key, value]) => {
      if (keys.includes(key)) {
        delete data[key];
      } else {
        removeObjectKey(value, keys);
      }
    });

    return data;
  }

  return data;
};

/* LOCAL STORAGE LISTENERS */
window.ipcStorage.set('EXAMPLE_KEY', 'Hello World!');
// eslint-disable-next-line no-console
console.log(window.ipcStorage.get('EXAMPLE_KEY'));

// eslint-disable-next-line prettier/prettier
export {};

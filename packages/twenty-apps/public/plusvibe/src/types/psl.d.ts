// psl's export map hides its declarations and omits its ESM default export.
declare module 'psl' {
  const publicSuffixList: typeof import('../../node_modules/psl/types/index');
  export default publicSuffixList;
}

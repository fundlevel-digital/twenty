type InstallDocumentElementPrototypesInput = {
  documentTarget: { body: object; head: object; documentElement: object };
  htmlElementPrototype: object;
};

export const installDocumentElementPrototypes = ({
  documentTarget,
  htmlElementPrototype,
}: InstallDocumentElementPrototypesInput): void => {
  for (const element of [
    documentTarget.body,
    documentTarget.head,
    documentTarget.documentElement,
  ]) {
    if (Object.prototype.isPrototypeOf.call(htmlElementPrototype, element))
      continue;

    // The DOM polyfill gives document elements an Element parent, which breaks HTML layout guards.
    Object.setPrototypeOf(Object.getPrototypeOf(element), htmlElementPrototype);
  }
};

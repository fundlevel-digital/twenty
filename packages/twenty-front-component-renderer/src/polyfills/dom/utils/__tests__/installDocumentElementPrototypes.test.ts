import { installDocumentElementPrototypes } from '../installDocumentElementPrototypes';

it('makes synthetic document elements participate in HTML layout checks', () => {
  class ElementBase {
    nodeType = 1;
  }
  class HtmlElement extends ElementBase {}
  class BodyElement extends ElementBase {
    bodyProperty = 'preserved';
  }
  class HeadElement extends ElementBase {}
  class DocumentElement extends ElementBase {}
  const documentTarget = {
    body: new BodyElement(),
    head: new HeadElement(),
    documentElement: new DocumentElement(),
  };
  expect(documentTarget.body).not.toBeInstanceOf(HtmlElement);

  installDocumentElementPrototypes({
    documentTarget,
    htmlElementPrototype: HtmlElement.prototype,
  });

  for (const element of Object.values(documentTarget)) {
    expect(element).toBeInstanceOf(HtmlElement);
    expect(element).toBeInstanceOf(ElementBase);
  }
  expect(documentTarget.body.bodyProperty).toBe('preserved');
});

it('preserves an existing HTML element prototype chain', () => {
  class HtmlElement {}
  class DocumentElement extends HtmlElement {}
  const documentTarget = {
    body: new DocumentElement(),
    head: new DocumentElement(),
    documentElement: new DocumentElement(),
  };
  const originalParent = Object.getPrototypeOf(DocumentElement.prototype);

  installDocumentElementPrototypes({
    documentTarget,
    htmlElementPrototype: HtmlElement.prototype,
  });

  expect(Object.getPrototypeOf(DocumentElement.prototype)).toBe(originalParent);
});

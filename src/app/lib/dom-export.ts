function isCrossOriginHttpUrl(rawUrl: string) {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl || trimmedUrl.startsWith('#')) {
    return false;
  }

  try {
    const parsedUrl = new URL(trimmedUrl, window.location.href);
    const isHttp = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    return isHttp && parsedUrl.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function styleValueHasCrossOriginUrl(styleValue: string) {
  const urlMatches = styleValue.matchAll(/url\((['"]?)(.*?)\1\)/gi);

  for (const match of urlMatches) {
    const extractedUrl = match[2];
    if (isCrossOriginHttpUrl(extractedUrl)) {
      return true;
    }
  }

  return false;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function mmToPx(mm: number) {
  return (mm * 96) / 25.4;
}

function cloneElementForExport(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  const clonedNode = cloneNodeWithInlineStyles(element) as HTMLElement;
  clonedNode.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');

  return { rect, width, height, clonedNode };
}

function buildSvgMarkupForExport(element: HTMLElement) {
  const { width, height, clonedNode } = cloneElementForExport(element);
  const serializedNode = new XMLSerializer().serializeToString(clonedNode);
  const svgMarkup =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<foreignObject width="100%" height="100%">${serializedNode}</foreignObject>` +
    '</svg>';

  return { svgMarkup, width, height };
}

function buildSvgBlobForExport(element: HTMLElement) {
  const { svgMarkup, width, height } = buildSvgMarkupForExport(element);
  return {
    svgBlob: new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' }),
    width,
    height,
  };
}

function buildSvgFallbackFilename(filename: string) {
  if (/\.[a-z0-9]+$/i.test(filename)) {
    return filename.replace(/\.[a-z0-9]+$/i, '.svg');
  }

  return `${filename}.svg`;
}

function parsePixelValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isTransparentColor(value: string) {
  const normalized = value.trim().toLowerCase();

  return (
    !normalized ||
    normalized === 'transparent' ||
    normalized === 'rgba(0, 0, 0, 0)' ||
    normalized === 'rgba(0,0,0,0)'
  );
}

function resolveCanvasTextAlign(value: string): CanvasTextAlign {
  if (value === 'center') return 'center';
  if (value === 'right' || value === 'end') return 'right';
  return 'left';
}

function applyCssTextTransform(value: string, textTransform: string) {
  if (textTransform === 'uppercase') return value.toUpperCase();
  if (textTransform === 'lowercase') return value.toLowerCase();
  if (textTransform === 'capitalize') {
    return value.replace(/\b(\p{L})/gu, char => char.toUpperCase());
  }

  return value;
}

function getExportElements(root: HTMLElement) {
  const elements: HTMLElement[] = [root];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  while (walker.nextNode()) {
    if (walker.currentNode instanceof HTMLElement) {
      elements.push(walker.currentNode);
    }
  }

  return elements;
}

function tryCreateGradient(
  context: CanvasRenderingContext2D,
  backgroundImage: string,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const normalized = backgroundImage.replace(/\s+/g, ' ').trim();

  if (!normalized.startsWith('linear-gradient(')) {
    return null;
  }

  const match = normalized.match(
    /linear-gradient\(([^,]+),\s*(rgba?\([^)]+\)|#[0-9a-fA-F]+)\s*,\s*(rgba?\([^)]+\)|#[0-9a-fA-F]+)\)/
  );

  if (!match) {
    return null;
  }

  const direction = match[1].trim().toLowerCase();
  const firstColor = match[2];
  const secondColor = match[3];
  const isHorizontal = direction.includes('right') || direction.includes('left');
  const gradient = context.createLinearGradient(
    x,
    y,
    isHorizontal ? x + width : x,
    isHorizontal ? y : y + height
  );

  gradient.addColorStop(0, firstColor);
  gradient.addColorStop(1, secondColor);

  return gradient;
}

function drawWrappedText(options: {
  context: CanvasRenderingContext2D;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lineHeight: number;
  textAlign: CanvasTextAlign;
}) {
  const { context, text, x, y, width, height, lineHeight, textAlign } = options;
  const rawLines = text
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const wrappedLines: string[] = [];

  for (const rawLine of rawLines.length > 0 ? rawLines : ['']) {
    const words = rawLine.split(' ');
    let currentLine = '';

    for (const word of words) {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;
      if (context.measureText(nextLine).width <= width || !currentLine) {
        currentLine = nextLine;
      } else {
        wrappedLines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  }

  const lines = wrappedLines.length > 0 ? wrappedLines : [''];
  const totalHeight = lines.length * lineHeight;
  let currentY = y + Math.max(0, (height - totalHeight) / 2);

  context.textAlign = textAlign;
  context.textBaseline = 'top';

  for (const line of lines) {
    if (currentY + lineHeight > y + height + 1) {
      break;
    }

    let drawX = x;
    if (textAlign === 'center') {
      drawX = x + width / 2;
    } else if (textAlign === 'right') {
      drawX = x + width;
    }

    context.fillText(line, drawX, currentY);
    currentY += lineHeight;
  }
}

function paintElementBox(
  context: CanvasRenderingContext2D,
  element: HTMLElement,
  rootRect: DOMRect
) {
  const rect = element.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  if (width <= 0 || height <= 0) {
    return;
  }

  const computedStyle = window.getComputedStyle(element);
  const x = rect.left - rootRect.left;
  const y = rect.top - rootRect.top;
  const backgroundImage = computedStyle.backgroundImage;
  const gradient = tryCreateGradient(context, backgroundImage, x, y, width, height);
  const backgroundColor = computedStyle.backgroundColor;

  if (gradient) {
    context.fillStyle = gradient;
    context.fillRect(x, y, width, height);
  } else if (!isTransparentColor(backgroundColor)) {
    context.fillStyle = backgroundColor;
    context.fillRect(x, y, width, height);
  }

  const borderTopWidth = parsePixelValue(computedStyle.borderTopWidth);
  const borderRightWidth = parsePixelValue(computedStyle.borderRightWidth);
  const borderBottomWidth = parsePixelValue(computedStyle.borderBottomWidth);
  const borderLeftWidth = parsePixelValue(computedStyle.borderLeftWidth);

  if (borderTopWidth > 0 && !isTransparentColor(computedStyle.borderTopColor)) {
    context.fillStyle = computedStyle.borderTopColor;
    context.fillRect(x, y, width, borderTopWidth);
  }

  if (borderRightWidth > 0 && !isTransparentColor(computedStyle.borderRightColor)) {
    context.fillStyle = computedStyle.borderRightColor;
    context.fillRect(x + width - borderRightWidth, y, borderRightWidth, height);
  }

  if (borderBottomWidth > 0 && !isTransparentColor(computedStyle.borderBottomColor)) {
    context.fillStyle = computedStyle.borderBottomColor;
    context.fillRect(x, y + height - borderBottomWidth, width, borderBottomWidth);
  }

  if (borderLeftWidth > 0 && !isTransparentColor(computedStyle.borderLeftColor)) {
    context.fillStyle = computedStyle.borderLeftColor;
    context.fillRect(x, y, borderLeftWidth, height);
  }
}

function paintElementText(
  context: CanvasRenderingContext2D,
  element: HTMLElement,
  rootRect: DOMRect
) {
  if (element.children.length > 0) {
    return;
  }

  const rawText = (element.innerText || element.textContent || '').trim();
  if (!rawText) {
    return;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const computedStyle = window.getComputedStyle(element);
  if (isTransparentColor(computedStyle.color)) {
    return;
  }

  const paddingTop = parsePixelValue(computedStyle.paddingTop);
  const paddingRight = parsePixelValue(computedStyle.paddingRight);
  const paddingBottom = parsePixelValue(computedStyle.paddingBottom);
  const paddingLeft = parsePixelValue(computedStyle.paddingLeft);
  const borderTopWidth = parsePixelValue(computedStyle.borderTopWidth);
  const borderRightWidth = parsePixelValue(computedStyle.borderRightWidth);
  const borderBottomWidth = parsePixelValue(computedStyle.borderBottomWidth);
  const borderLeftWidth = parsePixelValue(computedStyle.borderLeftWidth);
  const x = rect.left - rootRect.left + borderLeftWidth + paddingLeft;
  const y = rect.top - rootRect.top + borderTopWidth + paddingTop;
  const width = Math.max(1, rect.width - borderLeftWidth - borderRightWidth - paddingLeft - paddingRight);
  const height = Math.max(1, rect.height - borderTopWidth - borderBottomWidth - paddingTop - paddingBottom);
  const fontSize = parsePixelValue(computedStyle.fontSize) || 16;
  const lineHeight = parsePixelValue(computedStyle.lineHeight) || fontSize * 1.2;
  const fontParts = [
    computedStyle.fontStyle,
    computedStyle.fontVariant,
    computedStyle.fontWeight,
    `${fontSize}px`,
    computedStyle.fontFamily || 'Arial, sans-serif',
  ].filter(Boolean);

  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.fillStyle = computedStyle.color;
  context.font = fontParts.join(' ');

  drawWrappedText({
    context,
    text: applyCssTextTransform(rawText, computedStyle.textTransform),
    x,
    y,
    width,
    height,
    lineHeight,
    textAlign: resolveCanvasTextAlign(computedStyle.textAlign),
  });

  context.restore();
}

function cloneNodeWithInlineStyles(node: Node): Node {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent || '');
  }

  if (!(node instanceof Element)) {
    return node.cloneNode(false);
  }

  const clone = node.cloneNode(false) as Element;

  if (node instanceof HTMLElement && clone instanceof HTMLElement) {
    const computedStyle = window.getComputedStyle(node);
    for (const propertyName of Array.from(computedStyle)) {
      const propertyValue = computedStyle.getPropertyValue(propertyName);
      if (propertyValue && styleValueHasCrossOriginUrl(propertyValue)) {
        continue;
      }

      clone.style.setProperty(
        propertyName,
        propertyValue,
        computedStyle.getPropertyPriority(propertyName)
      );
    }

    if (node instanceof HTMLInputElement) {
      clone.setAttribute('value', node.value);
    }

    if (node instanceof HTMLImageElement && clone instanceof HTMLImageElement) {
      const imageUrl = node.currentSrc || node.src;
      if (imageUrl && isCrossOriginHttpUrl(imageUrl)) {
        clone.removeAttribute('srcset');
        clone.setAttribute(
          'src',
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
        );
      }
    }

    if (node instanceof HTMLTextAreaElement) {
      clone.textContent = node.value;
    }

    if (node instanceof HTMLSelectElement) {
      Array.from(node.options).forEach((option, index) => {
        const clonedOption = (clone as HTMLSelectElement).options[index];
        if (clonedOption) clonedOption.selected = option.selected;
      });
    }
  }

  if (clone instanceof HTMLElement) {
    clone.style.transform = 'none';
  }

  for (const child of Array.from(node.childNodes)) {
    clone.appendChild(cloneNodeWithInlineStyles(child));
  }

  return clone;
}

async function renderElementToCanvas(element: HTMLElement, scale = 2) {
  if ('fonts' in document) {
    await (document as Document & { fonts: FontFaceSet }).fonts.ready;
  }

  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Nao foi possivel preparar a exportacao da imagem.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.scale(scale, scale);

  const exportElements = getExportElements(element);
  for (const exportElement of exportElements) {
    paintElementBox(context, exportElement, rect);
  }

  for (const exportElement of exportElements) {
    paintElementText(context, exportElement, rect);
  }

  return { canvas, width, height };
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  if ('download' in HTMLAnchorElement.prototype) {
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } else {
    const popup = window.open(objectUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      window.location.assign(objectUrl);
    }
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 30_000);
}

function shouldUsePrintFallbackForPdf() {
  const userAgent = window.navigator.userAgent;
  const isIOSDevice =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (userAgent.includes('Mac') && window.navigator.maxTouchPoints > 1);
  const isCapacitorApp = Boolean((window as Window & { Capacitor?: unknown }).Capacitor);

  return isIOSDevice || isCapacitorApp;
}

function buildPrintDocumentMarkup(element: HTMLElement, filename: string) {
  const rect = element.getBoundingClientRect();
  const clonedNode = cloneNodeWithInlineStyles(element) as HTMLElement;
  const documentTitle = filename.replace(/\.pdf$/i, '');
  const forceSinglePage = element.dataset.exportPdfMode === 'single-page';
  const pageMarginMm = forceSinglePage ? 4 : 12;
  const bodyPaddingPx = forceSinglePage ? 0 : 16;
  const pageWidthPx = mmToPx(210);
  const pageHeightPx = mmToPx(297);
  const printableWidthPx = pageWidthPx - mmToPx(pageMarginMm * 2) - bodyPaddingPx * 2;
  const printableHeightPx = pageHeightPx - mmToPx(pageMarginMm * 2) - bodyPaddingPx * 2;
  const scale = forceSinglePage
    ? Math.min(
        1,
        printableWidthPx / Math.max(1, rect.width),
        printableHeightPx / Math.max(1, rect.height)
      )
    : 1;
  const scaledHeight = Math.max(1, Math.ceil(rect.height * scale));

  clonedNode.style.width = `${Math.max(1, Math.ceil(rect.width))}px`;
  clonedNode.style.maxWidth = '100%';

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(documentTitle)}</title>
    <style>
      :root {
        color-scheme: light;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      @page {
        size: A4 portrait;
        margin: ${pageMarginMm}mm;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }

      body {
        padding: ${bodyPaddingPx}px;
      }

      .print-frame {
        width: 100%;
        margin: 0 auto;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      .print-scale-shell {
        height: ${scaledHeight}px;
        overflow: hidden;
      }

      .print-scale-content {
        width: ${Math.max(1, Math.ceil(rect.width))}px;
        transform-origin: top left;
        transform: scale(${scale});
      }
    </style>
  </head>
  <body>
    <div class="print-frame">
      <div class="print-scale-shell">
        <div class="print-scale-content">${clonedNode.outerHTML}</div>
      </div>
    </div>
  </body>
</html>`;
}

function printElementAsPdf(element: HTMLElement, filename: string) {
  return new Promise<void>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    const markup = buildPrintDocumentMarkup(element, filename);
    let handled = false;

    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    const cleanup = () => {
      window.setTimeout(() => {
        iframe.remove();
      }, 1_000);
    };

    iframe.onload = () => {
      if (handled) {
        return;
      }
      handled = true;
      iframe.onload = null;

      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        reject(new Error('Nao foi possivel abrir a visualizacao para imprimir.'));
        return;
      }

      window.setTimeout(() => {
        try {
          frameWindow.focus();
          frameWindow.print();
          cleanup();
          resolve();
        } catch {
          cleanup();
          reject(new Error('Nao foi possivel abrir a visualizacao para imprimir.'));
        }
      }, 150);
    };

    iframe.srcdoc = markup;
    document.body.appendChild(iframe);
  });
}

function dataUrlToBytes(dataUrl: string) {
  const base64Data = dataUrl.split(',')[1] || '';
  const binaryString = window.atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes;
}

function createPdfFromJpegBytes(options: {
  jpegBytes: Uint8Array;
  imageWidth: number;
  imageHeight: number;
}) {
  const { jpegBytes, imageWidth, imageHeight } = options;
  const encoder = new TextEncoder();
  const pageWidth = 595;
  const pageHeight = Math.max(1, Math.round((pageWidth * imageHeight) / imageWidth));
  const contentStream = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ`;
  const contentBytes = encoder.encode(contentStream);

  const parts: Uint8Array[] = [];
  const offsets: number[] = [0];
  let totalLength = 0;

  const pushBytes = (bytes: Uint8Array) => {
    parts.push(bytes);
    totalLength += bytes.length;
  };

  const pushText = (text: string) => {
    pushBytes(encoder.encode(text));
  };

  pushText('%PDF-1.3\n%\xE2\xE3\xCF\xD3\n');

  const addObject = (objectNumber: number, prefix: string, binary?: Uint8Array, suffix?: string) => {
    offsets[objectNumber] = totalLength;
    pushText(prefix);
    if (binary) pushBytes(binary);
    if (suffix) pushText(suffix);
  };

  addObject(1, '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  addObject(2, '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n');
  addObject(
    3,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );
  addObject(
    4,
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
    jpegBytes,
    '\nendstream\nendobj\n'
  );
  addObject(
    5,
    `5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`,
    contentBytes,
    '\nendstream\nendobj\n'
  );

  const xrefOffset = totalLength;
  pushText('xref\n0 6\n0000000000 65535 f \n');
  for (let objectNumber = 1; objectNumber <= 5; objectNumber += 1) {
    pushText(`${String(offsets[objectNumber]).padStart(10, '0')} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(parts, { type: 'application/pdf' });
}

export async function downloadElementAsImage(element: HTMLElement, filename: string) {
  const { canvas } = await renderElementToCanvas(element);
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    try {
      canvas.toBlob(resolve, 'image/jpeg', 0.92);
    } catch (error) {
      reject(error);
    }
  });

  if (!blob) {
    throw new Error('Nao foi possivel gerar a imagem.');
  }

  downloadBlob(blob, filename);
}

export async function downloadElementAsPdf(element: HTMLElement, filename: string) {
  if (shouldUsePrintFallbackForPdf()) {
    await printElementAsPdf(element, filename);
    return;
  }

  try {
    const { canvas, width, height } = await renderElementToCanvas(element);
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const pdfBlob = createPdfFromJpegBytes({
      jpegBytes: dataUrlToBytes(jpegDataUrl),
      imageWidth: canvas.width,
      imageHeight: canvas.height,
    });

    if (!pdfBlob || width <= 0 || height <= 0) {
      throw new Error('Nao foi possivel gerar o PDF.');
    }

    downloadBlob(pdfBlob, filename);
  } catch {
    await printElementAsPdf(element, filename);
  }
}

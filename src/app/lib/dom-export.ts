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
      clone.style.setProperty(
        propertyName,
        computedStyle.getPropertyValue(propertyName),
        computedStyle.getPropertyPriority(propertyName)
      );
    }

    if (node instanceof HTMLInputElement) {
      clone.setAttribute('value', node.value);
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
  const clonedNode = cloneNodeWithInlineStyles(element) as HTMLElement;
  clonedNode.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');

  const serializedNode = new XMLSerializer().serializeToString(clonedNode);
  const svgMarkup =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<foreignObject width="100%" height="100%">${serializedNode}</foreignObject>` +
    '</svg>';
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Nao foi possivel renderizar a visualizacao.'));
      img.src = objectUrl;
    });

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
    context.drawImage(image, 0, 0, width, height);

    return { canvas, width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
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
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) {
    throw new Error('Nao foi possivel gerar a imagem.');
  }
  downloadBlob(blob, filename);
}

export async function downloadElementAsPdf(element: HTMLElement, filename: string) {
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
}

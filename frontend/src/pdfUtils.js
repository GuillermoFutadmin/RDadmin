/**
 * Convierte un archivo PDF en un arreglo de imágenes de alta resolución (Data URLs)
 * utilizando PDF.js para que puedan adjuntarse e imprimirse directamente como páginas en el Machote y Contrato.
 *
 * Nota: si `pdfUrl` apunta al proxy del backend (/api/prospects/{id}/render-pdf),
 * se descarga primero con fetch() para que el interceptor de auth agregue el Bearer token.
 * Esto evita que PDF.js intente acceder directamente a la URL con XHR sin credenciales.
 */
export async function convertPdfToImageUrls(pdfUrl) {
  if (!pdfUrl) return [];

  // Asegurar que pdfjsLib esté cargado en la ventana
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="/pdf.min.js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('No se pudo cargar /pdf.min.js')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = '/pdf.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Error al cargar /pdf.min.js'));
      document.head.appendChild(script);
    });
  }

  if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }

  try {
    // Descargar el PDF primero con fetch() para que el interceptor de auth
    // incluya el Bearer token (necesario para rutas /api/ protegidas).
    let pdfData;
    if (pdfUrl.includes('/api/')) {
      const resp = await fetch(pdfUrl);
      if (!resp.ok) throw new Error(`No se pudo obtener el PDF de render (${resp.status})`);
      pdfData = await resp.arrayBuffer();
    } else {
      pdfData = { url: pdfUrl, withCredentials: false };
    }

    const loadingTask = window.pdfjsLib.getDocument(
      pdfData instanceof ArrayBuffer ? { data: pdfData } : pdfData
    );
    const pdfDoc = await loadingTask.promise;
    const pageImages = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      // Escala 2.0 para nitidez de impresión en papel/PDF
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({
        canvasContext: ctx,
        viewport
      }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      pageImages.push({
        pageNum,
        totalPages: pdfDoc.numPages,
        dataUrl,
        width: viewport.width,
        height: viewport.height,
        isLandscape: viewport.width > viewport.height
      });
    }

    return pageImages;
  } catch (err) {
    console.error('Error al convertir el PDF de render en imágenes:', err);
    return [];
  }
}

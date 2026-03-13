import * as pdfjs from 'pdfjs-dist';

// Configurar el worker para que funcione en Next.js/Browser
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * Extracts all text from a PDF file.
 * Processed entirely in the browser to save server resources.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
        fullText += pageText + "\n";
        
        // Limitar a los primeros ~50,000 caracteres para evitar prompts excesivamente largos
        // aunque Gemini aguante 1M, un PDF de cientos de páginas puede ser ruidoso
        if (fullText.length > 100000) break; 
    }

    return fullText.trim();
}

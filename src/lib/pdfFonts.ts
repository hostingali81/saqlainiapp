// Font loader utility for pdfmake with Hindi support

export async function loadHindiFonts() {
  try {
    // Load font files from public directory
    const [regularResponse, boldResponse] = await Promise.all([
      fetch('/fonts/NotoSansDevanagari-Regular.ttf'),
      fetch('/fonts/NotoSansDevanagari-Bold.ttf')
    ]);

    if (!regularResponse.ok || !boldResponse.ok) {
      console.error('Font files not found. Please add fonts to public/fonts/');
      return null;
    }

    const [regularBlob, boldBlob] = await Promise.all([
      regularResponse.blob(),
      boldResponse.blob()
    ]);

    // Convert to base64
    const regularBase64 = await blobToBase64(regularBlob);
    const boldBase64 = await blobToBase64(boldBlob);

    return {
      NotoSansDevanagari: {
        normal: regularBase64,
        bold: boldBase64,
        italics: regularBase64,
        bolditalics: boldBase64
      }
    };
  } catch (error) {
    console.error('Error loading fonts:', error);
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

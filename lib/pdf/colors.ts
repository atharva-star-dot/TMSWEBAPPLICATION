export function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || "#1e3a5c").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return [30, 58, 92];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Fetches an image URL and returns it as a base64 data URL (needed because
 * jsPDF's addImage requires a data URL, not a remote URL, in the browser). */
export async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

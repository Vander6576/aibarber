/**
 * Utility to convert tricky image sharing URLs (like Google Drive, Dropbox) 
 * into direct image URLs that can be loaded properly in HTML <img> tags.
 */
export function getDirectImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  const trimmedUrl = url.trim();

  // 1. Google Drive URLs
  if (trimmedUrl.includes('drive.google.com') || trimmedUrl.includes('docs.google.com')) {
    // Matches /file/d/[ID]/view or similar
    const fileIdMatch = trimmedUrl.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
    
    // Matches ?id=[ID] or &id=[ID]
    const idParamMatch = trimmedUrl.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
    if (idParamMatch && idParamMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${idParamMatch[1]}`;
    }
  }

  // 2. Dropbox URLs
  if (trimmedUrl.includes('dropbox.com')) {
    // Swap www.dropbox.com with dl.dropboxusercontent.com (this gets the direct asset bypass)
    let directUrl = trimmedUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    // Remove query parameters like ?dl=0 or change them to raw=1
    directUrl = directUrl.replace(/[?&]dl=0/, '');
    if (!directUrl.includes('?')) {
      directUrl += '?raw=1';
    } else if (!directUrl.includes('raw=1')) {
      directUrl += '&raw=1';
    }
    return directUrl;
  }

  return trimmedUrl;
}

/**
 * Utility to normalize image URLs.
 * Extracts relative `/uploads/...` paths so images load correctly regardless of
 * whether they were saved with an old IP, old domain, or Cloudflare tunnel.
 */
export function getImageUrl(url?: string | null): string {
    if (!url) return '';
    
    // If it's a base64 Data URL, return as is
    if (url.startsWith('data:')) return url;
    
    // If it contains /uploads/, strip any leading domain/IP
    // e.g. "http://143.14.36.198/uploads/abc.jpg" -> "/uploads/abc.jpg"
    const uploadIndex = url.indexOf('/uploads/');
    if (uploadIndex !== -1) {
        return url.substring(uploadIndex);
    }
    
    return url;
}

// Insert a Cloudinary transformation so grid/list thumbnails download a
// resized, auto-quality/format image instead of the full original.
// Falls back to the original URL untouched for anything that isn't a
// Cloudinary /upload/ URL (already-transformed URLs, other hosts, empty values).
export const thumb = (url, w = 300, h = 300) => {
    if (!url || typeof url !== "string") return url;
    const marker = "/upload/";
    const idx = url.indexOf(marker);
    if (idx === -1) return url;
    const insertAt = idx + marker.length;
    return `${url.slice(0, insertAt)}w_${w},h_${h},c_fill,q_auto,f_auto/${url.slice(insertAt)}`;
};

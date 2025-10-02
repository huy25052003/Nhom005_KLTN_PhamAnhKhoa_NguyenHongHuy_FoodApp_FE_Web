import http from "../lib/http.js";

export async function uploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await http.post("admin/uploads", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return (
    res.data?.url ||
    res.data?.Location ||
    res.data?.location ||
    res.data?.data?.url ||
    res.data
  );
}

import http from "../lib/http";

export async function requestEmailVerification(email) {
  const res = await http.post("/account/email/request", { email });
  return res.data;
}

export async function verifyEmailCode(code) {
  const res = await http.post("/account/email/verify", { code });
  return res.data;
}   

export async function verifyPhoneFirebase(firebaseToken) {
  const res = await http.post("/account/phone/verify", { token: firebaseToken });
  return res.data;
}
import http from "../lib/http";

export async function initConversation() {
  const { data: me } = await http.get("users/me");
  const res = await http.post(`/conversations?customerId=${me.id}`);
  return res.data;
}

export async function getMessages(convId) {
  const res = await http.get(`/conversations/${convId}/messages`);
  return res.data;
}

export async function getAllConversations() {
  const res = await http.get("/conversations");
  return res.data;
}

export async function sendMessage(payload) {
    const res = await http.post("/messages", payload); 
    return res.data;
}
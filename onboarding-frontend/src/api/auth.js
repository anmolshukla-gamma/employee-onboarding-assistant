import api from "./axios";

export function register({ email, full_name, password }) {
  return api.post("/auth/register", { email, full_name, password });
}

export function login({ email, password }) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  return api.post("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

export function fetchMe() {
  return api.get("/auth/me");
}



export function updateMyProfile(payload) {
  return api.patch("/auth/me", payload);
}

export function changeMyPassword(payload) {
  return api.post("/auth/change-password", payload);
}
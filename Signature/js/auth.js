import { supabase } from "../config.js";

const email = document.getElementById("email");
const password = document.getElementById("password");
const msg = document.getElementById("authMsg");

document.getElementById("loginBtn").addEventListener("click", async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });
  if (error) return (msg.textContent = error.message);
  window.location = "main.html";
});

document.getElementById("signupBtn").addEventListener("click", async () => {
  const { error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
  });
  if (error) return (msg.textContent = error.message);
  msg.textContent = "Signup successful! Check your email for confirmation.";
});

document.getElementById("forgotBtn").addEventListener("click", async () => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.value);
  if (error) return (msg.textContent = error.message);
  msg.textContent = "Password reset link sent to your email.";
});

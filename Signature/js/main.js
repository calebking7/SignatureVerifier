import { supabase } from "../config.js";

const userEmail = document.getElementById("userEmail");
const historyList = document.getElementById("historyList");
const logoutBtn = document.getElementById("logoutBtn");
const deleteAllBtn = document.getElementById("deleteAllBtn");

const { data: { user } } = await supabase.auth.getUser();
if (!user) window.location = "index.html";
userEmail.textContent = user.email;

async function loadHistory() {
  const { data, error } = await supabase
    .from("scan_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

    try {
      const { data, error } = await supabase
        .from("scan_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Error loading history:', error);
        historyList.innerHTML = '<li class="text-sm text-red-600">Failed to load history. Check console for details.</li>';
        return;
      }

      historyList.innerHTML = "";

      if (!data || data.length === 0) {
        historyList.innerHTML = '<li class="text-sm text-gray-500">No scans yet.</li>';
        return;
      }
  data.forEach(item => {
    const li = document.createElement("li");
    li.className = 'flex items-center justify-between bg-white p-3 rounded-md shadow-sm';

    li.innerHTML = `
      <div>
        <p class="text-sm text-gray-800">${item.scan_result}</p>
        <small class="text-xs text-gray-500">${new Date(item.created_at).toLocaleString()}</small>
      </div>
      <div class="flex items-center space-x-2">
        <button class="px-2 py-1 bg-[#002D62] text-white rounded text-xs shareBtn">Share</button>
        <button class="px-2 py-1 bg-[#D4AF37] text-black rounded text-xs deleteBtn">Delete</button>
      </div>
    `;

    const shareBtn = li.querySelector('.shareBtn');
    const deleteBtn = li.querySelector('.deleteBtn');

    shareBtn.onclick = () => navigator.share?.({ text: item.scan_result }) || alert(item.scan_result);
    deleteBtn.onclick = async () => {
      await supabase.from('scan_history').delete().eq('id', item.id);
      loadHistory();
    };

    historyList.appendChild(li);
  });
  } catch (e) {
    console.error('Unexpected error in loadHistory:', e);
    historyList.innerHTML = '<li class="text-sm text-red-600">Failed to load history. Check console for details.</li>';
  }
}

// Initial load with explicit error handling
try {
  await loadHistory();
} catch (e) {
  console.error('Initial history load failed:', e);
  historyList.innerHTML = '<li class="text-sm text-red-600">Failed to load history. Check console for details.</li>';
}

deleteAllBtn.onclick = async () => {
  await supabase.from("scan_history").delete().eq("user_id", user.id);
  loadHistory();
};

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  window.location = "index.html";
};

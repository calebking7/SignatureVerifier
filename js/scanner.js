import { supabase, GEMINI_API_KEY, GEMINI_MODEL } from "../config.js";

// Elements (aligned with updated main.html)
const documentInput = document.getElementById('documentUpload');
const signatureInput = document.getElementById('signatureUpload');
const documentLabel = document.getElementById('documentLabel');
const signatureLabel = document.getElementById('signatureLabel');
const docFilename = document.getElementById('docFilename');
const sigFilename = document.getElementById('sigFilename');

const documentPreview = document.getElementById('documentPreview');
const signaturePreview = document.getElementById('signaturePreview');
const documentScanOverlay = document.getElementById('documentScanOverlay');
const signatureScanOverlay = document.getElementById('signatureScanOverlay');

const verifyButton = document.getElementById('verifyButton');
const reportButton = document.getElementById('reportButton');

const buttonText = document.getElementById('verifyButton');
const reportTextEl = document.getElementById('reportText');

const resultBox = document.getElementById('resultBox');
const resultText = document.getElementById('resultText');
const confidenceDisplay = document.getElementById('confidenceDisplay');
const confidenceScoreText = document.getElementById('confidenceScoreText');
const confidenceFill = document.getElementById('confidenceFill');
const confidenceLabel = document.getElementById('confidenceLabel');
const reportBox = document.getElementById('reportBox');

const historyList = document.getElementById('historyList');

const API_KEY = GEMINI_API_KEY || "";
const MODEL = GEMINI_MODEL || "gemini-2.1";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const MAX_RETRIES = 4;

// Auth guard
const { data: { user } } = await supabase.auth.getUser();
if (!user) window.location = 'index.html';

document.getElementById('userEmail').textContent = user.email;

// --- Helper functions ---
function validateImageQuality(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const minWidth = 100;  // Minimum width in pixels
      const minHeight = 50; // Minimum height for a signature
      if (img.width < minWidth || img.height < minHeight) {
        reject(new Error('Image resolution too low for accurate analysis. Please provide a higher quality image.'));
      }
      if (file.size < 1000) { // 1KB
        reject(new Error('Image file size too small. This may indicate a low-quality image.'));
      }
      resolve(true);
    };
    img.onerror = () => reject(new Error('Failed to load image for quality validation'));
    img.src = URL.createObjectURL(file);
  });
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
  });
}

async function fetchWithRetry(url, options, retries = 0) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    if (retries < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, Math.pow(2, retries) * 1000));
      return fetchWithRetry(url, options, retries + 1);
    }
    throw err;
  }
}

function handleFilePreview(input, previewElement, filenameElement, labelElement, defaultLabel) {
  const file = input.files[0];
  const fileName = file ? file.name : 'No file selected.';
  filenameElement.textContent = fileName;
  labelElement.textContent = file ? 'File Selected' : defaultLabel;

  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewElement.src = e.target.result;
      previewElement.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  } else {
    previewElement.classList.add('hidden');
    previewElement.src = '';
  }
}

function resetResult() {
  resultBox.className = 'mt-6 p-4 rounded-xl border-4 border-dashed min-h-[140px] flex flex-col items-center justify-center bg-gray-50';
  resultText.className = 'text-lg font-semibold text-gray-500 text-center';
  resultText.textContent = "Upload both files and click 'Run AI Verification' to begin.";
  confidenceDisplay.classList.add('hidden');
  confidenceFill.style.width = '0%';
  confidenceScoreText.textContent = '--';
  confidenceLabel.textContent = 'Neutral';
}

function checkInputs() {
  verifyButton.disabled = !(documentInput.files.length > 0 && signatureInput.files.length > 0);
  reportButton.disabled = !(documentInput.files.length > 0);
}

// --- Load history ---
async function loadHistory() {
  const { data, error } = await supabase.from('scan_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return console.error(error);
  historyList.innerHTML = '';
  data.forEach(item => {
    const li = document.createElement('li');
    li.className = 'flex items-center justify-between bg-white p-3 rounded-md shadow-sm';

    li.innerHTML = `
      <div>
        <p class=\"text-sm text-gray-800\">${item.scan_result}</p>
        <small class=\"text-xs text-gray-500\">${new Date(item.created_at).toLocaleString()}</small>
      </div>
      <div class=\"flex items-center space-x-2\">
        <button class=\"px-2 py-1 bg-[#002D62] text-white rounded text-xs shareBtn\">Share</button>
        <button class=\"px-2 py-1 bg-[#D4AF37] text-black rounded text-xs deleteBtn\">Delete</button>
      </div>
    `;

    const shareBtn = li.querySelector('.shareBtn');
    const deleteBtn = li.querySelector('.deleteBtn');
    shareBtn.onclick = () => navigator.share?.({ text: item.scan_result }) || alert(item.scan_result);
    deleteBtn.onclick = async () => { await supabase.from('scan_history').delete().eq('id', item.id); loadHistory(); };
    historyList.appendChild(li);
  });
}

await loadHistory();

document.getElementById('deleteAllBtn').onclick = async () => { await supabase.from('scan_history').delete().eq('user_id', user.id); loadHistory(); };

document.getElementById('logoutBtn').onclick = async () => { await supabase.auth.signOut(); window.location = 'index.html'; };

// --- Event listeners ---
documentInput.addEventListener('change', (e) => { handleFilePreview(e.target, documentPreview, docFilename, documentLabel, 'Choose Document'); resetResult(); reportBox.classList.add('hidden'); checkInputs(); });
signatureInput.addEventListener('change', (e) => { handleFilePreview(e.target, signaturePreview, sigFilename, signatureLabel, 'Choose Signature Sample'); resetResult(); checkInputs(); });

// Clipboard paste handling: allow pasting images into either area
async function handlePasteEvent(e, targetInput, previewEl, filenameEl, labelEl, defaultLabel) {
  const items = e.clipboardData?.items || [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (!blob) continue;
      // Convert blob to File with a timestamped name
      const file = new File([blob], `pasted-${Date.now()}.${blob.type.split('/')[1]}`, { type: blob.type });
      // Create a DataTransfer to assign to the input.files
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      targetInput.files = dataTransfer.files;
      handleFilePreview(targetInput, previewEl, filenameEl, labelEl, defaultLabel);
      checkInputs();
      // prevent default paste handling for images
      e.preventDefault();
      return true;
    }
  }
  // If no items in clipboardData, try using the async clipboard API as a fallback
  try {
    if (navigator.clipboard && navigator.clipboard.read) {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const file = new File([blob], `pasted-${Date.now()}.${type.split('/')[1]}`, { type: blob.type });
            const dt = new DataTransfer();
            dt.items.add(file);
            targetInput.files = dt.files;
            handleFilePreview(targetInput, previewEl, filenameEl, labelEl, defaultLabel);
            checkInputs();
            return true;
          }
        }
      }
    }
  } catch (err) {
    console.warn('clipboard.read() fallback failed or is unsupported', err);
  }

  return false;
}

// Attach paste listeners to the preview wrappers and labels for convenience
const docWrapper = document.getElementById('documentPreview')?.parentElement;
const sigWrapper = document.getElementById('signaturePreview')?.parentElement;
// Also consider the whole card container (so clicking anywhere on the card selects it)
const docCard = documentInput?.parentElement;
const sigCard = signatureInput?.parentElement;

// Active paste target state ('document' | 'signature' | null)
let activeTarget = null;

function clearActiveHighlight() {
  if (docCard) docCard.classList.remove('ring-4', 'ring-[#002D62]', 'rounded-md');
  if (sigCard) sigCard.classList.remove('ring-4', 'ring-[#002D62]', 'rounded-md');
  activeTarget = null;
}

function setActiveTarget(target) {
  clearActiveHighlight();
  if (target === 'document' && docCard) {
    docCard.classList.add('ring-4', 'ring-[#002D62]', 'rounded-md');
    activeTarget = 'document';
  } else if (target === 'signature' && sigCard) {
    sigCard.classList.add('ring-4', 'ring-[#002D62]', 'rounded-md');
    activeTarget = 'signature';
  }
}

if (docWrapper) {
  docWrapper.setAttribute('tabindex', '0');
  docWrapper.addEventListener('paste', (e) => handlePasteEvent(e, documentInput, documentPreview, docFilename, documentLabel, 'Choose Document'));
}
if (sigWrapper) {
  sigWrapper.setAttribute('tabindex', '0');
  sigWrapper.addEventListener('paste', (e) => handlePasteEvent(e, signatureInput, signaturePreview, sigFilename, signatureLabel, 'Choose Signature Sample'));
}
if (docCard) {
  docCard.setAttribute('tabindex', '0');
  docCard.addEventListener('click', () => setActiveTarget('document'));
}
if (sigCard) {
  sigCard.setAttribute('tabindex', '0');
  sigCard.addEventListener('click', () => setActiveTarget('signature'));
}
// Also allow clicking the labels to select the paste target (works even if no image present yet)
if (documentLabel) documentLabel.addEventListener('click', () => setActiveTarget('document'));
if (signatureLabel) signatureLabel.addEventListener('click', () => setActiveTarget('signature'));

// Also listen globally so users can paste after focusing the input area
document.addEventListener('paste', async (e) => {
  // If user selected a target by click, prefer that
  if (activeTarget === 'document') {
    const handled = await handlePasteEvent(e, documentInput, documentPreview, docFilename, documentLabel, 'Choose Document');
    if (handled) return;
  }
  if (activeTarget === 'signature') {
    const handled = await handlePasteEvent(e, signatureInput, signaturePreview, sigFilename, signatureLabel, 'Choose Signature Sample');
    if (handled) return;
  }
  // If no explicit active target, check focused element as fallback
  const active = document.activeElement;
  if (docWrapper && docWrapper.contains(active)) {
    const handled = await handlePasteEvent(e, documentInput, documentPreview, docFilename, documentLabel, 'Choose Document');
    if (handled) return;
  }
  if (sigWrapper && sigWrapper.contains(active)) {
    const handled = await handlePasteEvent(e, signatureInput, signaturePreview, sigFilename, signatureLabel, 'Choose Signature Sample');
    if (handled) return;
  }
  // If neither, ignore and do not hijack global paste
});

// Clear active highlight when clicking outside the wrappers
document.addEventListener('click', (e) => {
  // Use card containers for containment tests so the highlight remains when clicking inside the card
  if (!docCard || !sigCard) return;
  if (!docCard.contains(e.target) && !sigCard.contains(e.target)) {
    clearActiveHighlight();
  }
});

// Validate image content using Gemini (YES/NO)
async function validateImageContent(file, prompt) {
  const b64 = await toBase64(file);
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: file.type, data: b64 } }] }],
    systemInstruction: { parts: [{ text: "You are a content analyzer. Respond only with 'YES' or 'NO'." }] }
  };
  const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
  const res = await fetchWithRetry(API_URL, options);
  const aiText = res?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();
  return aiText === 'YES';
}

// Main verification flow
verifyButton.addEventListener('click', async () => {
  if (verifyButton.disabled) return;
  verifyButton.disabled = true;
  verifyButton.textContent = 'Analyzing...';
  // show scanning overlays
  if (documentScanOverlay) documentScanOverlay.classList.remove('hidden');
  if (signatureScanOverlay) signatureScanOverlay.classList.remove('hidden');
  resetResult();
  resultText.textContent = 'Starting validation checks...';
  reportBox.classList.add('hidden');

  try {
    const docFile = documentInput.files[0];
    const sigFile = signatureInput.files[0];

    resultText.textContent = 'Validating image quality...';
    await validateImageQuality(docFile);
    await validateImageQuality(sigFile);

    resultText.textContent = 'Validating document for signature presence...';
    const docOk = await validateImageContent(docFile, "Does this image contain a clear, well-defined handwritten signature or seal that is complete and unobstructed? The signature must be clearly visible and not partially cut off or blurred. Respond only with 'YES' or 'NO'.");
    if (!docOk) throw new Error('The uploaded document does not contain a clear, well-defined signature.');

    resultText.textContent = 'Validating sample signature content...';
    const sigOk = await validateImageContent(sigFile, "Is this image a clear, high-quality sample of a complete handwritten signature with good contrast against its background? The signature must not be blurred, partially cut off, or obscured. Respond only with 'YES' or 'NO'.");
    if (!sigOk) throw new Error('The sample image does not appear to be a clear, high-quality signature sample.');

    // Prepare comparison prompt
    resultText.textContent = 'AI is analyzing features and handwriting characteristics...';
    const docB64 = await toBase64(docFile);
    const sigB64 = await toBase64(sigFile);

    const systemPrompt = `You are an expert forensic document analyst specializing in signature verification. Compare the signature visible in the first image (the document) with the second image (the authentic sample) using these strict criteria:
1. Line quality and flow
2. Stroke characteristics and pressure points
3. Entry and exit points
4. Size and proportion consistency
5. Angle and slant patterns
6. Formation of specific characters
7. Spacing between elements

Provide extremely careful analysis. Set confidence below 70% if there are any doubts. Only provide 90%+ confidence for near-perfect matches or clear forgeries with obvious inconsistencies.

Do not output anything except a single line of text formatted exactly as: VERDICT: [AUTHENTIC or FORGED], CONFIDENCE: [X]%`;

    const payload = {
      contents: [{ role: 'user', parts: [ { text: 'Compare the signature on the document (Image 1) against the sample (Image 2). Provide the VERDICT and CONFIDENCE SCORE as requested.' }, { inlineData: { mimeType: documentInput.files[0].type, data: docB64 } }, { inlineData: { mimeType: signatureInput.files[0].type, data: sigB64 } } ] }],
      systemInstruction: { parts: [{ text: systemPrompt }] }
    };

    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    const res = await fetchWithRetry(API_URL, options);
    const aiText = res?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || '';

    const verdictMatch = aiText.match(/VERDICT:\s*(AUTHENTIC|FORGED)/);
    const confidenceMatch = aiText.match(/CONFIDENCE:\s*(\d+)%/);
    const aiVerdict = verdictMatch ? verdictMatch[1] : 'INCONCLUSIVE';
    const confidenceScore = confidenceMatch ? Math.min(parseInt(confidenceMatch[1], 10), 99) : 50;

    let resultClass = '', resultMessage = '', labelText = '', iconSvg = '';
    if (aiVerdict === 'FORGED') {
      if (confidenceScore >= 90) {
        labelText = 'Very High Confidence in Forgery';
        resultClass = 'border-red-800 bg-red-50';
      } else if (confidenceScore >= 80) {
        labelText = 'High Confidence in Forgery';
        resultClass = 'border-red-600 bg-red-50';
      } else if (confidenceScore >= 70) {
        labelText = 'Moderate Confidence in Forgery';
        resultClass = 'border-orange-600 bg-orange-50';
      } else {
        labelText = 'Low Confidence - Further Analysis Needed';
        resultClass = 'border-yellow-600 bg-yellow-50';
      }
      resultMessage = '<span class="text-red-700 text-3xl font-extrabold">FORGED</span>';
      iconSvg = '<svg class="w-10 h-10 mr-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.398 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    } else if (aiVerdict === 'AUTHENTIC') {
      if (confidenceScore >= 90) {
        labelText = 'Very High Confidence Match';
        resultClass = 'border-green-800 bg-green-50';
      } else if (confidenceScore >= 80) {
        labelText = 'High Confidence Match';
        resultClass = 'border-green-600 bg-green-50';
      } else if (confidenceScore >= 70) {
        labelText = 'Moderate Confidence Match';
        resultClass = 'border-yellow-600 bg-yellow-50';
      } else {
        labelText = 'Low Confidence - Further Analysis Needed';
        resultClass = 'border-yellow-600 bg-yellow-50';
      }
      resultMessage = '<span class="text-green-700 text-3xl font-extrabold">AUTHENTIC</span>';
      iconSvg = '<svg class="w-10 h-10 mr-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    } else {
      resultClass = 'border-yellow-600 bg-yellow-50';
      resultMessage = '<span class="text-yellow-700 text-3xl font-extrabold">INCONCLUSIVE</span>';
      iconSvg = '<svg class="w-10 h-10 mr-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9.228a4.242 4.242 0 010 6.004m10.54-10.54a12 12 0 00-15.01-1.341"></path></svg>';
      labelText = 'AI response was ambiguous.';
    }

    resultBox.className = `mt-6 p-4 rounded-xl border-4 transition-all min-h-[140px] flex flex-col items-center justify-center ${resultClass}`;
    resultText.className = 'text-3xl font-extrabold flex items-center mb-4';
    resultText.innerHTML = iconSvg + resultMessage;

    confidenceDisplay.classList.remove('hidden');
    confidenceScoreText.textContent = `${confidenceScore}%`;
    confidenceFill.style.width = `${confidenceScore}%`;
    confidenceLabel.textContent = labelText;

    // save to history
    const { data: insertData, error: insertErr } = await supabase.from('scan_history').insert({ user_id: user.id, scan_result: `${aiVerdict} (${confidenceScore}%)` });
    if (insertErr) {
      console.error('Failed to save scan history:', insertErr);
      const note = document.createElement('div');
      note.className = 'mt-2 text-sm text-red-600';
      note.textContent = 'Warning: failed to save scan history. Check console for details.';
      resultBox.appendChild(note);
    } else {
      try {
        await loadHistory();
      } catch (e) {
        console.error('loadHistory failed after insert:', e);
        const note = document.createElement('div');
        note.className = 'mt-2 text-sm text-red-600';
        note.textContent = 'Warning: failed to refresh history. Check console.';
        resultBox.appendChild(note);
      }
    }

  } catch (err) {
    console.error(err);
    resultBox.className = 'mt-6 p-4 rounded-xl border-4 min-h-[140px] flex flex-col items-center justify-center border-orange-600 bg-orange-100';
    resultText.className = 'text-lg font-bold text-orange-800';
    resultText.textContent = err.message || 'Failed to run AI analysis.';
    confidenceDisplay.classList.add('hidden');
  } finally {
    // hide scanning overlays
    if (documentScanOverlay) documentScanOverlay.classList.add('hidden');
    if (signatureScanOverlay) signatureScanOverlay.classList.add('hidden');
    verifyButton.disabled = false;
    verifyButton.textContent = 'Run AI Verification';
  }
});

// Report generation (for document only)
reportButton.addEventListener('click', async () => {
  if (reportButton.disabled) return;
  reportButton.disabled = true;
  reportTextEl.innerHTML = '<span class="text-[#002D62] italic">AI is writing the detailed report...</span>';
  reportBox.classList.remove('hidden');
  // show scanning overlay only on document preview
  if (documentScanOverlay) documentScanOverlay.classList.remove('hidden');
  try {
    const docFile = documentInput.files[0];
    const valid = await validateImageContent(docFile, "Does this image contain any visible handwritten or drawn mark that could be interpreted as a signature or seal? Respond only with 'YES' or 'NO'.");
    if (!valid) { reportBox.className = 'mt-4 p-4 rounded-xl border-2 bg-red-50'; reportTextEl.innerHTML = '<strong class="text-red-700">Validation Failed:</strong> The uploaded file does not clearly show a document with a signature.'; return; }

    const docB64 = await toBase64(docFile);
    const systemPrompt = "You are a professional forensic handwriting expert. Analyze the signature visible in the provided image (the document). Focus only on observable characteristics and write a concise single-paragraph report (max 120 words).";
    const payload = { contents: [{ role: 'user', parts: [{ text: 'Analyze the signature in this document and provide a forensic summary report.' }, { inlineData: { mimeType: docFile.type, data: docB64 } }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    const res = await fetchWithRetry(API_URL, options);
    const aiText = res?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (aiText) { reportTextEl.classList.remove('italic'); reportTextEl.textContent = aiText; } else { reportTextEl.classList.add('italic'); reportTextEl.innerHTML = '<span class="text-red-500">Error:</span> Could not generate report.'; }
  } catch (err) {
    console.error(err);
    reportTextEl.classList.add('italic');
    reportTextEl.innerHTML = '<span class="text-red-500">ERROR:</span> Failed to generate report.';
  } finally {
    if (documentScanOverlay) documentScanOverlay.classList.add('hidden');
    reportButton.disabled = false;
  }
});

// Initial state
checkInputs();



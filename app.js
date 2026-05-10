const tabs = document.querySelectorAll('.tab');
const sections = document.querySelectorAll('.section');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    const section = document.getElementById(tab.dataset.tab);
    if (section) section.classList.add('active');
  });
});

const fields = ['projectName', 'locations', 'character', 'tone', 'cutCount', 'ratio', 'apiMemo'];

function loadFields() {
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const value = localStorage.getItem(id);
    if (value !== null) el.value = value;
    el.addEventListener('input', () => localStorage.setItem(id, el.value));
  });
}

function getLines(value) {
  return value.split('\n').map(v => v.trim()).filter(Boolean);
}

function getProjectData() {
  return {
    projectName: document.getElementById('projectName')?.value || '',
    locations: document.getElementById('locations')?.value || '',
    character: document.getElementById('character')?.value || '',
    tone: document.getElementById('tone')?.value || '',
    cutCount: document.getElementById('cutCount')?.value || '7',
    ratio: document.getElementById('ratio')?.value || '9:16 vertical'
  };
}

function buildCuts() {
  const data = getProjectData();
  const locations = getLines(data.locations);
  const count = Math.max(1, Number(data.cutCount || 1));
  const cuts = [];

  for (let i = 0; i < count; i++) {
    const location = locations[i % Math.max(1, locations.length)] || '장소 미입력';
    const imagePrompt = `${location}, ${data.character}, ${data.tone}, ${data.ratio}, cinematic composition, no text, no logo, no watermark`;
    const videoPrompt = `10-second cinematic video, ${location}, ${data.character}, ${data.tone}, smooth camera movement, emotional K-POP music video pacing, ${data.ratio}, no text, no logo, no watermark`;
    cuts.push({ number: i + 1, location, imagePrompt, videoPrompt });
  }
  return cuts;
}

function generateAll() {
  const cuts = buildCuts();
  localStorage.setItem('generatedCuts', JSON.stringify(cuts));
  renderCuts(cuts);
  populateImageCutSelect(cuts);
  renderStoryboard();
  renderStatus('컷 생성 완료', 'ok');
}

function renderCuts(cuts = JSON.parse(localStorage.getItem('generatedCuts') || '[]')) {
  const cutList = document.getElementById('cutList');
  if (!cutList) return;
  cutList.innerHTML = '';

  cuts.forEach(cut => {
    const div = document.createElement('div');
    div.className = 'cut';
    div.innerHTML = `
      <h3>컷 ${cut.number}</h3>
      <p><strong>장소:</strong> ${cut.location}</p>
      <label>이미지 프롬프트</label>
      <div class="output">${cut.imagePrompt}</div>
      <label>영상 프롬프트</label>
      <div class="output">${cut.videoPrompt}</div>
    `;
    cutList.appendChild(div);
  });
}

function populateImageCutSelect(cuts = JSON.parse(localStorage.getItem('generatedCuts') || '[]')) {
  const select = document.getElementById('imageCut');
  if (!select) return;
  select.innerHTML = '';
  cuts.forEach(cut => {
    const option = document.createElement('option');
    option.value = cut.number;
    option.textContent = `컷 ${cut.number} - ${cut.location}`;
    select.appendChild(option);
  });
  select.addEventListener('change', () => {
    const selected = cuts.find(c => String(c.number) === select.value);
    const prompt = document.getElementById('imagePrompt');
    if (selected && prompt) prompt.value = selected.imagePrompt;
  });
  if (cuts[0] && document.getElementById('imagePrompt')) {
    document.getElementById('imagePrompt').value = cuts[0].imagePrompt;
  }
}

function saveProject() {
  const data = getProjectData();
  const key = `project_${Date.now()}`;
  localStorage.setItem(key, JSON.stringify(data));
  renderProjects();
  renderStatus('프로젝트 저장 완료', 'ok');
}

function renderProjects() {
  const container = document.getElementById('projects');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(localStorage)
    .filter(key => key.startsWith('project_'))
    .sort()
    .reverse()
    .forEach(key => {
      const data = JSON.parse(localStorage.getItem(key));
      const div = document.createElement('div');
      div.className = 'project';
      div.innerHTML = `<strong>${data.projectName || '무제 프로젝트'}</strong><div><button class="ghost" onclick="loadProject('${key}')">불러오기</button> <button class="danger" onclick="deleteProject('${key}')">삭제</button></div>`;
      container.appendChild(div);
    });
}

function loadProject(key) {
  const data = JSON.parse(localStorage.getItem(key));
  Object.entries(data).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = value;
      localStorage.setItem(id, value);
    }
  });
  renderStatus('프로젝트 불러오기 완료', 'ok');
}

function deleteProject(key) {
  localStorage.removeItem(key);
  renderProjects();
}

function exportProject() {
  const data = { ...getProjectData(), cuts: buildCuts() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.projectName || 'ai-video-project'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function clearCurrent() {
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
    localStorage.removeItem(id);
  });
  localStorage.removeItem('generatedCuts');
  renderCuts([]);
  renderStoryboard();
}

function copyAllCuts() {
  const cuts = buildCuts();
  const text = cuts.map(c => `컷 ${c.number}\n장소: ${c.location}\n이미지: ${c.imagePrompt}\n영상: ${c.videoPrompt}`).join('\n\n');
  navigator.clipboard.writeText(text);
  renderStatus('전체 컷 복사 완료', 'ok');
}

function previewImagePrompt() {
  const prompt = document.getElementById('imagePrompt')?.value || '';
  addGalleryItem('', prompt || '프롬프트 없음');
}

async function callImageAPI() {
  const endpoint = document.getElementById('imageEndpoint')?.value;
  const prompt = document.getElementById('imagePrompt')?.value;
  if (!endpoint) return renderStatus('이미지 API 엔드포인트를 입력하세요', 'warn');
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    addGalleryItem(data.imageUrl || data.url || '', prompt);
  } catch (e) {
    renderStatus('이미지 API 호출 실패', 'warn');
  }
}

function addGalleryItem(src, caption) {
  const gallery = document.getElementById('gallery');
  if (!gallery) return;
  const div = document.createElement('div');
  div.className = 'thumb';
  div.innerHTML = src ? `<img src="${src}" alt="preview"><small>${caption}</small>` : `<div style="height:120px;padding:12px;display:flex;align-items:center;justify-content:center;text-align:center;color:#aeb6c8">이미지 미리보기 카드</div><small>${caption}</small>`;
  gallery.prepend(div);
}

function setupImageUpload() {
  const input = document.getElementById('imageUpload');
  if (!input) return;
  input.addEventListener('change', e => {
    [...e.target.files].forEach(file => {
      const reader = new FileReader();
      reader.onload = () => addGalleryItem(reader.result, file.name);
      reader.readAsDataURL(file);
    });
  });
}

function addChat(role, text) {
  const log = document.getElementById('chatLog');
  if (!log) return;
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function localAssistant() {
  const input = document.getElementById('chatInput');
  const question = input?.value || '';
  addChat('user', question);
  addChat('assistant', `현재 프로젝트 기준으로 컷 구성과 프롬프트를 정리했습니다. 먼저 [전체 생성]을 누른 뒤 컷 관리/스토리보드 탭에서 결과를 확인하세요.`);
  if (input) input.value = '';
}

async function callChatAPI() {
  const endpoint = document.getElementById('chatEndpoint')?.value;
  const message = document.getElementById('chatInput')?.value || '';
  if (!endpoint) return renderStatus('GPT API 엔드포인트를 입력하세요', 'warn');
  addChat('user', message);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, project: getProjectData() })
    });
    const data = await res.json();
    addChat('assistant', data.reply || data.message || '응답을 받았습니다.');
  } catch (e) {
    addChat('assistant', 'API 호출에 실패했습니다.');
  }
}

function renderStoryboard() {
  const cuts = buildCuts();
  const grid = document.getElementById('storyboardGrid');
  if (!grid) return;
  grid.innerHTML = '';
  cuts.forEach(cut => {
    const div = document.createElement('div');
    div.className = 'panelShot';
    div.innerHTML = `<strong>컷 ${cut.number}</strong><span>${cut.location}</span><span class="small">K-POP MV / cinematic tourism / 9:16</span>`;
    grid.appendChild(div);
  });

  const music = document.getElementById('musicYoutube');
  if (music) {
    music.textContent = `SUNO 스타일: 60초 이내, energetic K-POP dance pop, cinematic synth, dramatic build-up, bright chorus, Korean tourism commercial mood\n\n유튜브 제목: ${getProjectData().projectName || 'AI 영상 프로젝트'} | K-POP 시네마틱 여행 숏폼\n\n설명: 컷별 장소를 K-POP 뮤직비디오 스타일로 연결한 세로형 숏폼 영상입니다.`;
  }
}

function copyStoryboard() {
  const text = document.getElementById('musicYoutube')?.textContent || '';
  navigator.clipboard.writeText(text);
  renderStatus('스토리보드 문구 복사 완료', 'ok');
}

function saveSettings() {
  const memo = document.getElementById('apiMemo')?.value || '';
  localStorage.setItem('apiMemo', memo);
  renderStatus('설정 저장 완료', 'ok');
}

function downloadZipGuide() {
  alert('GitHub Pages에는 index.html, app.js, manifest.webmanifest, service-worker.js를 저장소 맨 위(root)에 업로드하세요.');
}

function clearAllData() {
  localStorage.clear();
  location.reload();
}

function requestNotification() {
  if (!('Notification' in window)) return renderStatus('이 브라우저는 알림을 지원하지 않습니다', 'warn');
  Notification.requestPermission().then(() => renderStatus('알림 권한 요청 완료', 'ok'));
}

function testNotification() {
  if (Notification.permission === 'granted') {
    new Notification('AI 영상 제작 비서', { body: '테스트 알림입니다.' });
  } else {
    renderStatus('먼저 알림 권한을 허용하세요', 'warn');
  }
}

function renderStatus(text, type = '') {
  const status = document.getElementById('status');
  if (!status) return;
  status.innerHTML = `<span class="pill ${type}">${text}</span>`;
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.style.display = 'inline-block';
    installBtn.onclick = () => deferredPrompt.prompt();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}

window.addEventListener('load', () => {
  loadFields();
  renderProjects();
  renderCuts();
  populateImageCutSelect();
  setupImageUpload();
  renderStatus(navigator.onLine ? '온라인 상태' : '오프라인 상태', navigator.onLine ? 'ok' : 'warn');
});

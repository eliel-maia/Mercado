/* ==========================================================================
   01. REGISTRO E CONTROLE DO SERVICE WORKER E INSTALAÇÃO PWA
   ========================================================================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service Worker OK'))
      .catch(err => console.log('Erro SW:', err));
  });
}

let deferredPrompt = null;

// Captura o evento nativo para permitir a instalação da PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('beforeinstallprompt capturado com sucesso.');
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  console.log('PWA instalada com sucesso!');
});

// Dispara o prompt de instalação (com suporte a Android e orientações para iOS)
function triggerInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Utilizador aceitou a instalação.');
      } else {
        console.log('Utilizador recusou a instalação.');
      }
      deferredPrompt = null;
    });
  } else {
    const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    
    if (isIOS) {
      alert("Para instalar no iPhone/iPad:\n\n1. Toque no botão de Partilha (ícone quadrado com uma seta para cima) na barra inferior do Safari.\n2. Role para baixo e selecione 'Adicionar ao Ecrã Principal'.");
    } else {
      alert("Para instalar o aplicativo:\n\n• No Android (Chrome): Toque nos 3 pontos no canto superior direito e escolha 'Instalar aplicação' ou 'Adicionar ao ecrã principal'.");
    }
  }
}

/* ==========================================================================
   02. DADOS INICIAIS E PERSISTÊNCIA (LocalStorage)
   ========================================================================== */
const defaultStores = [
  { id: 's1', name: 'Coop' },
  { id: 's2', name: 'Tauste' },
  { id: 's3', name: 'Garça' },
  { id: 's4', name: 'Atacadão' }
];

const defaultItems = [
  { id: '1', name: 'Papel Higiênico H', quantity: 1, unit: 'UN', category: 'Higiene', preferredStore: null, checked: false, prices: { s1: 27.90, s2: 27.99, s3: 23.99, s4: 22.50 }, storeNotes: { s3: 'c/24 fls' } },
  { id: '2', name: 'Listerine', quantity: 1, unit: 'UN', category: 'Higiene', preferredStore: null, checked: false, prices: { s1: 16.98, s2: 36.90, s3: 22.99, s4: 18.90 }, storeNotes: { s1: '500ml' } },
  { id: '3', name: 'Asepxia', quantity: 1, unit: 'UN', category: 'Higiene', preferredStore: null, checked: false, prices: { s1: 11.45, s2: 11.20, s3: null, s4: 10.99 }, storeNotes: {} },
  { id: '4', name: 'Filtro Café', quantity: 2, unit: 'UN', category: 'Alimentos', preferredStore: null, checked: false, prices: { s1: 4.29, s2: 4.29, s3: 4.29, s4: 3.99 }, storeNotes: { s1: '3 corações' } },
  { id: '5', name: 'Guardanapo', quantity: 1, unit: 'UN', category: 'Limpeza', preferredStore: null, checked: false, prices: { s1: 8.59, s2: 8.59, s3: 7.99, s4: 8.10 }, storeNotes: { s3: '200 folhas' } },
  { id: '6', name: 'Mamão', quantity: 1, unit: 'Kg', category: 'Alimentos', preferredStore: null, checked: false, prices: { s1: 11.98, s2: 13.90, s3: 9.99, s4: 10.50 }, storeNotes: {} },
  { id: '7', name: 'Maçã', quantity: 1, unit: 'Kg', category: 'Alimentos', preferredStore: null, checked: false, prices: { s1: 9.45, s2: 9.80, s3: 8.99, s4: 8.79 }, storeNotes: {} }
];

let stores = [];
let items = [];
let activeStoreFilter = null;
let activeCategoryFilter = 'Todos';

function initData() {
  try {
    const savedStores = localStorage.getItem('mc_stores_v63');
    const savedItems = localStorage.getItem('mc_items_v63');
    stores = savedStores ? JSON.parse(savedStores) : defaultStores;
    items = savedItems ? JSON.parse(savedItems) : defaultItems;
  } catch (e) {
    stores = defaultStores;
    items = defaultItems;
  }
}

function saveData() {
  localStorage.setItem('mc_stores_v63', JSON.stringify(stores));
  localStorage.setItem('mc_items_v63', JSON.stringify(items));
}

function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `R$&nbsp;${value.toFixed(2).replace('.', ',')}`;
}

function renderAll() {
  renderCategoryPills();
  renderCardsList();
  renderSummaries();
}

/* ==========================================================================
   03. RENDERIZAÇÃO DE CATEGORIAS E FILTROS
   ========================================================================== */
function renderCategoryPills() {
  const container = document.getElementById('categoryPills');
  const categoriesSet = new Set(items.map(i => i.category || 'Outros'));
  const categories = ['Todos', ...Array.from(categoriesSet)];

  container.innerHTML = categories.map(cat => {
    const count = cat === 'Todos' ? items.length : items.filter(i => (i.category || 'Outros') === cat).length;
    const isSelected = activeCategoryFilter === cat;

    return `
      <button onclick="filterByCategory('${cat}')" class="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isSelected ? 'bg-orange-500 text-white shadow-orange-500/30 shadow-md' : 'app-card border border-[var(--border-color)] opacity-70 hover:opacity-100'}">
        ${cat}${cat === 'Todos' ? ` (${count})` : ''}
      </button>
    `;
  }).join('');
}

function filterByCategory(cat) {
  activeCategoryFilter = cat;
  renderAll();
}

/* ==========================================================================
   04. RENDERIZAÇÃO DA LISTA DE PRODUTOS E CARDS
   ========================================================================== */
function renderCardsList() {
  const container = document.getElementById('cardsListContainer');
  const searchQuery = document.getElementById('searchInput').value.toLowerCase();

  let filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery);
    const matchesCat = activeCategoryFilter === 'Todos' || (item.category || 'Outros') === activeCategoryFilter;
    
    if (activeStoreFilter) {
      const validPrices = Object.entries(item.prices)
        .filter(([storeId, price]) => stores.some(s => s.id === storeId) && price !== null && price > 0)
        .map(([_, price]) => price);
      
      if (validPrices.length === 0) return false;
      const minPrice = Math.min(...validPrices);
      const priceInStore = item.prices[activeStoreFilter];
      const isCheapestInThisStore = priceInStore !== null && priceInStore === minPrice && validPrices.length > 1;
      return matchesSearch && matchesCat && isCheapestInThisStore;
    }

    return matchesSearch && matchesCat;
  });

  if (filteredItems.length === 0) {
    container.innerHTML = `
      <div class="app-card p-8 text-center opacity-50 text-xs rounded-2xl border">
        Nenhum produto encontrado.
      </div>
    `;
    return;
  }

  container.innerHTML = filteredItems.map(item => {
    const qty = item.quantity || 1;

    let displayPrice = null;
    let displayNote = '';
    let storeNameDisplay = '';
    let isCheapest = false;

    const validPrices = Object.entries(item.prices)
      .filter(([storeId, price]) => stores.some(s => s.id === storeId) && price !== null && price > 0)
      .map(([_, price]) => price);
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

    if (activeStoreFilter) {
      displayPrice = item.prices[activeStoreFilter];
      displayNote = (item.storeNotes && item.storeNotes[activeStoreFilter]) || '';
      const stObj = stores.find(s => s.id === activeStoreFilter);
      storeNameDisplay = stObj ? stObj.name : '';
      isCheapest = displayPrice !== null && displayPrice === minPrice && validPrices.length > 1;
    } else {
      let chosenStoreId = null;
      if (item.preferredStore && item.prices[item.preferredStore] !== null && item.prices[item.preferredStore] > 0 && stores.some(s => s.id === item.preferredStore)) {
        chosenStoreId = item.preferredStore;
      } else {
        const bestEntry = Object.entries(item.prices).find(([sId, p]) => stores.some(s => s.id === sId) && p === minPrice);
        if (bestEntry) chosenStoreId = bestEntry[0];
      }

      if (chosenStoreId) {
        displayPrice = item.prices[chosenStoreId];
        const stObj = stores.find(s => s.id === chosenStoreId);
        storeNameDisplay = stObj ? stObj.name : '';
        displayNote = (item.storeNotes && item.storeNotes[chosenStoreId]) || '';
      } else {
        displayPrice = null;
        storeNameDisplay = '';
      }
      isCheapest = validPrices.length > 1 && displayPrice === minPrice;
    }

    const subText = displayNote ? `${qty} • ${item.unit || 'UN'} • ${displayNote}` : `${qty} • ${item.unit || 'UN'}`;

    return `
      <div class="app-card p-3 rounded-2xl border shadow-md flex items-center justify-between transition-all ${item.checked ? 'opacity-40 line-through' : ''}">
        <div class="flex items-center space-x-3 overflow-hidden pr-2">
          <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleItemCheck('${item.id}')" class="rounded text-orange-500 focus:ring-orange-500 w-4 h-4 flex-shrink-0 cursor-pointer">
          <div class="truncate">
            <div class="font-bold text-xs truncate text-[var(--text-main)]">${item.name}</div>
            <div class="text-[10px] text-[var(--text-sub)] mt-0.5 truncate">
              <span>${subText}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-3 flex-shrink-0">
          <div class="text-right">
            ${storeNameDisplay ? `<div class="text-[9px] font-bold text-orange-500 uppercase tracking-wide mb-0.5 flex items-center justify-end space-x-1"><span>${storeNameDisplay}</span>${item.preferredStore ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Mercado Prioritário"></span>' : ''}</div>` : ''}
            <div class="inline-block px-2 py-0.5 rounded-lg text-xs font-extrabold ${isCheapest ? 'bg-emerald-600 text-white shadow-sm' : 'text-[var(--text-main)] opacity-80'}">
              ${formatCurrency(displayPrice)}
            </div>
          </div>

          <div class="flex items-center space-x-1 border-l border-[var(--border-color)] pl-2">
            <button onclick="openEditItemModal('${item.id}')" class="opacity-50 hover:opacity-100 p-1" title="Editar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            </button>
            <button onclick="deleteItem('${item.id}')" class="text-rose-500 hover:opacity-80 p-1" title="Apagar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   05. RESUMOS SUPERIORES POR MERCADO
   ========================================================================== */
function renderSummaries() {
  const container = document.getElementById('storeSummaries');
  const storeTotals = {};
  const storeCounts = {};

  stores.forEach(s => {
    storeTotals[s.id] = 0;
    storeCounts[s.id] = 0;
  });

  items.forEach(item => {
    const qty = item.quantity || 1;
    const validPrices = Object.entries(item.prices)
      .filter(([storeId, price]) => stores.some(s => s.id === storeId) && price !== null && price > 0)
      .map(([_, price]) => price);

    if (validPrices.length > 0) {
      const minPrice = Math.min(...validPrices);
      stores.forEach(store => {
        const price = item.prices[store.id];
        if (price !== null && price === minPrice) {
          storeTotals[store.id] += (price * qty);
          storeCounts[store.id] += 1;
        }
      });
    }
  });

  container.innerHTML = stores.map(store => {
    const greenTotal = storeTotals[store.id] || 0;
    const greenCount = storeCounts[store.id] || 0;
    const hasBest = greenCount > 0;
    const isSelected = activeStoreFilter === store.id;

    return `
      <div onclick="toggleStoreFilter('${store.id}')" class="flex-1 px-2 text-center min-w-[75px] max-w-[100px] cursor-pointer rounded-xl transition-all py-1 ${isSelected ? 'bg-orange-500/20 border border-orange-500/40 shadow-inner' : 'hover:opacity-80'}">
        <div class="flex items-center justify-center space-x-1">
          <span class="text-[10px] font-semibold ${isSelected ? 'text-orange-500 font-bold' : 'opacity-70'} truncate">${store.name}</span>
          ${hasBest ? '<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>' : ''}
        </div>
        <div class="text-xs font-bold ${hasBest ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-60'} leading-tight mt-0.5 whitespace-nowrap">
          ${formatCurrency(greenTotal)}
        </div>
        <div class="text-[9px] opacity-50 mt-0.5 font-medium">${greenCount} verde${greenCount !== 1 ? 's' : ''}</div>
      </div>
    `;
  }).join('');
}

function toggleStoreFilter(storeId) {
  if (activeStoreFilter === storeId) {
    activeStoreFilter = null;
  } else {
    activeStoreFilter = storeId;
  }
  renderAll();
}

function toggleItemCheck(id) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.checked = !item.checked;
    saveData();
    renderAll();
  }
}

function deleteItem(id) {
  if (confirm('Deseja realmente apagar este item?')) {
    items = items.filter(i => i.id !== id);
    saveData();
    renderAll();
  }
}

/* ==========================================================================
   06. MODAL DE BACKUP E RESTAURO DE DADOS
   ========================================================================== */
const backupModal = document.getElementById('backupModal');
document.getElementById('backupModalBtn').onclick = () => backupModal.classList.remove('hidden');
document.getElementById('closeBackupModal').onclick = () => backupModal.classList.add('hidden');

document.getElementById('exportJsonBtn').onclick = () => {
  const data = { version: 'v63', stores, items };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `mercado_compare_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  backupModal.classList.add('hidden');
};

document.getElementById('triggerImportBtn').onclick = () => document.getElementById('importJsonInput').click();
document.getElementById('importJsonInput').onchange = (e) => {
  const fileReader = new FileReader();
  if (e.target.files[0]) {
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (importedData.stores && importedData.items) {
          stores = importedData.stores;
          items = importedData.items;
          saveData();
          renderAll();
          alert('Backup importado com sucesso!');
          backupModal.classList.add('hidden');
        }
      } catch (error) { alert('Erro ao ler o arquivo JSON.'); }
    };
  }
};

document.getElementById('resetDataBtn').onclick = () => {
  if (confirm('Deseja restaurar os dados originais?')) {
    stores = defaultStores;
    items = defaultItems;
    activeStoreFilter = null;
    activeCategoryFilter = 'Todos';
    saveData();
    renderAll();
    backupModal.classList.add('hidden');
  }
};

/* ==========================================================================
   07. MODAL DE ADICIONAR / EDITAR ITENS E PRIORIDADE DE MERCADO
   ========================================================================== */
const itemModal = document.getElementById('itemModal');
document.getElementById('addItemBtn').onclick = () => openItemModal();
document.getElementById('closeItemModal').onclick = () => itemModal.classList.add('hidden');

function openItemModal(item = null) {
  document.getElementById('modalTitle').innerText = item ? 'Editar Item' : 'Novo Item';
  document.getElementById('itemId').value = item ? item.id : '';
  document.getElementById('itemName').value = item ? item.name : '';
  document.getElementById('itemQuantity').value = item ? (item.quantity || 1) : 1;
  document.getElementById('itemUnit').value = item ? (item.unit || 'UN') : 'UN';
  document.getElementById('itemCategory').value = item ? (item.category || 'Higiene') : 'Higiene';

  window.currentPreferredStore = item ? item.preferredStore : null;

  const priceInputsContainer = document.getElementById('priceInputs');
  priceInputsContainer.innerHTML = stores.map(store => {
    const isPreferred = window.currentPreferredStore === store.id;
    return `
      <div class="space-y-1 bg-[var(--bg-input)] p-2 rounded-xl border border-[var(--border-color)]">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold block">${store.name}</span>
          <button type="button" onclick="togglePreferredStore('${store.id}')" id="pref-btn-${store.id}" class="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${isPreferred ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50' : 'bg-[var(--bg-page)] text-[var(--text-sub)] border-[var(--border-color)] hover:border-orange-500'}">
            <span class="w-2 h-2 rounded-full ${isPreferred ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-orange-400'}"></span>
            <span>${isPreferred ? 'Prioritário' : 'Definir Prioridade'}</span>
          </button>
        </div>
        <div class="flex gap-2">
          <input type="number" step="0.01" data-store-id="${store.id}" value="${item && item.prices[store.id] !== undefined && item.prices[store.id] !== null ? item.prices[store.id] : ''}" placeholder="Preço (R$)" class="store-price-input w-28 px-2.5 py-1.5 text-xs border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
          <input type="text" data-store-note-id="${store.id}" value="${item && item.storeNotes && item.storeNotes[store.id] ? item.storeNotes[store.id] : ''}" placeholder="Obs/Marca..." class="store-note-input flex-1 px-2.5 py-1.5 text-xs border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
        </div>
      </div>
    `;
  }).join('');

  itemModal.classList.remove('hidden');
}

function togglePreferredStore(storeId) {
  if (window.currentPreferredStore === storeId) {
    window.currentPreferredStore = null;
  } else {
    window.currentPreferredStore = storeId;
  }

  stores.forEach(store => {
    const btn = document.getElementById(`pref-btn-${store.id}`);
    if (btn) {
      const isPreferred = window.currentPreferredStore === store.id;
      btn.className = `flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${isPreferred ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50' : 'bg-[var(--bg-page)] text-[var(--text-sub)] border-[var(--border-color)] hover:border-orange-500'}`;
      btn.innerHTML = `
        <span class="w-2 h-2 rounded-full ${isPreferred ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-orange-400'}"></span>
        <span>${isPreferred ? 'Prioritário' : 'Definir Prioridade'}</span>
      `;
    }
  });
}

function openEditItemModal(id) {
  const item = items.find(i => i.id === id);
  if (item) openItemModal(item);
}

document.getElementById('itemForm').onsubmit = (e) => {
  e.preventDefault();
  const id = document.getElementById('itemId').value;
  const name = document.getElementById('itemName').value;
  const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;
  const unit = document.getElementById('itemUnit').value;
  const category = document.getElementById('itemCategory').value;
  const preferredStore = window.currentPreferredStore || null;

  const prices = {};
  const storeNotes = {};

  document.querySelectorAll('.store-price-input').forEach(input => {
    const storeId = input.getAttribute('data-store-id');
    const val = parseFloat(input.value);
    prices[storeId] = isNaN(val) ? null : val;
  });

  document.querySelectorAll('.store-note-input').forEach(input => {
    const storeId = input.getAttribute('data-store-note-id');
    const text = input.value.trim();
    if (text) storeNotes[storeId] = text;
  });

  if (id) {
    const item = items.find(i => i.id === id);
    if (item) {
      item.name = name;
      item.quantity = quantity;
      item.unit = unit;
      item.category = category;
      item.preferredStore = preferredStore;
      item.prices = prices;
      item.storeNotes = storeNotes;
    }
  } else {
    items.push({
      id: Date.now().toString(),
      name,
      quantity,
      unit,
      category,
      preferredStore,
      checked: false,
      prices,
      storeNotes
    });
  }

  saveData();
  renderAll();
  itemModal.classList.add('hidden');
};

/* ==========================================================================
   08. MODAL DE GERENCIAR MERCADOS
   ========================================================================== */
const storeModal = document.getElementById('storeModal');
document.getElementById('manageStoresBtn').onclick = () => openStoreModal();
document.getElementById('closeStoreModal').onclick = () => storeModal.classList.add('hidden');

function openStoreModal() {
  const storeList = document.getElementById('storeList');
  storeList.innerHTML = stores.map(store => `
    <div class="flex items-center justify-between bg-[var(--bg-input)] p-2.5 rounded-2xl border border-[var(--border-color)]">
      <span class="text-xs font-semibold">${store.name}</span>
      <button onclick="removeStore('${store.id}')" class="text-rose-500 hover:opacity-80 p-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
    </div>
  `).join('');
  storeModal.classList.remove('hidden');
}

document.getElementById('addStoreBtn').onclick = () => {
  const input = document.getElementById('newStoreName');
  const name = input.value.trim();
  if (name) {
    stores.push({ id: 's_' + Date.now(), name });
    input.value = '';
    saveData();
    renderAll();
    openStoreModal();
  }
};

function removeStore(id) {
  if (stores.length <= 1) {
    alert('Você precisa ter pelo menos um mercado cadastrado.');
  } else {
    stores = stores.filter(s => s.id !== id);
    saveData();
    renderAll();
    openStoreModal();
  }
}

document.getElementById('searchInput').oninput = () => renderCardsList();

/* ==========================================================================
   09. GESTÃO DE TEMA (Claro/Escuro) E CORES DAS BARRAS DO SISTEMA
   ========================================================================== */
const themeToggleBtn = document.getElementById('themeToggleBtn');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

function applyTheme(isDark) {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark'; // Força o Android a pintar a barra inferior de escuro
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
    localStorage.setItem('mc_theme', 'dark');
    if (metaThemeColor) metaThemeColor.setAttribute('content', '#0b0b0e');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light'; // Força o Android a pintar a barra inferior de claro
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
    localStorage.setItem('mc_theme', 'light');
    if (metaThemeColor) metaThemeColor.setAttribute('content', '#f4f4f6');
  }
}

themeToggleBtn.onclick = () => applyTheme(!document.documentElement.classList.contains('dark'));

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(localStorage.getItem('mc_theme') !== 'light');
  initData();
  renderAll();
});


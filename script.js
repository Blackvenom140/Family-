/**
 * 🛒 Shalini's Grocery List App - script.js
 * ✅ Fully Connected with index.html
 * ✅ Firebase Realtime Database
 * ✅ Mobile Optimized
 * ✅ All CRUD Operations
 */

// ============================================
// 🔥 FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDQZz7ZSYUMRpU2rqkCB-jDYnUISt_8sPw",
  authDomain: "otp-system-66bb9.firebaseapp.com",
  databaseURL: "https://otp-system-66bb9-default-rtdb.firebaseio.com",
  projectId: "otp-system-66bb9",
  storageBucket: "otp-system-66bb9.firebasestorage.app",
  messagingSenderId: "1061367534933",
  appId: "1:1061367534933:web:cd93446243997ea797cbdc",
  measurementId: "G-J347YB4H09"
};

// ============================================
// 🚀 INITIALIZE FIREBASE
// ============================================
let db;
let isFirebaseReady = false;

try {
  // Check if Firebase SDK is loaded
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK not loaded! Check index.html for Firebase scripts.');
  }

  // Initialize Firebase App
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase App Initialized');

  // Initialize Database
  db = firebase.database();
  console.log('✅ Firebase Database Ready');

  isFirebaseReady = true;

} catch (error) {
  console.error('❌ Firebase Initialization Error:', error);
  isFirebaseReady = false;
}

// ============================================// 🎯 DOM ELEMENTS (Match with index.html IDs)
// ============================================
const elements = {
  groceryForm: null,
  itemName: null,
  itemQty: null,
  itemWeight: null,
  addBtn: null,
  btnText: null,
  refreshBtn: null,
  deleteAllBtn: null,
  listContainer: null,
  itemCount: null,
  toast: null,
  statusDot: null,
  statusText: null,
  formCard: null
};

// Cache all elements after DOM loads
function cacheElements() {
  elements.groceryForm = document.getElementById('groceryForm');
  elements.itemName = document.getElementById('itemName');
  elements.itemQty = document.getElementById('itemQty');
  elements.itemWeight = document.getElementById('itemWeight');
  elements.addBtn = document.getElementById('addBtn');
  elements.btnText = document.getElementById('btnText');
  elements.refreshBtn = document.getElementById('refreshBtn');
  elements.deleteAllBtn = document.getElementById('deleteAllBtn');
  elements.listContainer = document.getElementById('listContainer');
  elements.itemCount = document.getElementById('itemCount');
  elements.toast = document.getElementById('toast');
  elements.statusDot = document.getElementById('statusDot');
  elements.statusText = document.getElementById('statusText');
  elements.formCard = document.getElementById('formCard');

  console.log('✅ All DOM Elements Cached');
}

// ============================================
// 📦 APP STATE
// ============================================
const state = {
  editMode: false,
  currentEditId: null,
  isConnected: false,
  itemsCount: 0
};

// ============================================// 🎨 UI FUNCTIONS
// ============================================

// Show Toast Notification
function showToast(message, type = 'success', duration = 3000) {
  if (!elements.toast) return;

  elements.toast.textContent = message;
  elements.toast.className = `toast ${type}`;
  elements.toast.style.display = 'block';

  // Vibration feedback for mobile
  if ('vibrate' in navigator && type !== 'success') {
    navigator.vibrate(type === 'error' ? [200, 100, 200] : 100);
  }

  setTimeout(() => {
    elements.toast.style.display = 'none';
  }, duration);
}

// Update Connection Status (Header)
function updateConnectionStatus(connected, message) {
  state.isConnected = connected;

  if (elements.statusDot) {
    elements.statusDot.className = `status-dot ${connected ? 'connected' : ''}`;
  }

  if (elements.statusText) {
    elements.statusText.textContent = message;
  }

  console.log(connected ? '🟢 Connected' : '🔴 Disconnected:', message);
}

// Escape HTML to prevent XSS attacks
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Render Grocery List in listContainer
function renderList(items) {
  if (!elements.listContainer) return;

  elements.listContainer.innerHTML = '';
  // Count items
  const count = items ? Object.keys(items).length : 0;
  state.itemsCount = count;

  // Update item count badge
  if (elements.itemCount) {
    elements.itemCount.textContent = `${count} item${count !== 1 ? 's' : ''}`;
  }

  // Empty State - No items
  if (!items || count === 0) {
    elements.listContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clipboard-list"></i>
        <p><strong>No items yet!</strong><br>Add your first grocery item above 🛒</p>
      </div>
    `;
    return;
  }

  // Convert object to array & sort by newest first
  const itemsArray = Object.entries(items)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // Create item cards
  itemsArray.forEach(item => {
    const card = document.createElement('div');
    card.className = 'grocery-item';
    card.dataset.id = item.id;

    card.innerHTML = `
      <div class="item-info">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-details">
          <span><i class="fas fa-hashtag"></i> Qty: ${item.quantity}</span>
          ${item.weight ? `<span><i class="fas fa-weight-hanging"></i> ${escapeHtml(item.weight)}</span>` : ''}
        </div>
      </div>
      <div class="item-actions">
        <button class="btn-icon btn-edit" data-action="edit" data-id="${item.id}" title="Edit">
          <i class="fas fa-pen"></i>
        </button>
        <button class="btn-icon btn-delete" data-action="delete" data-id="${item.id}" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    elements.listContainer.appendChild(card);  });

  // Attach click events to edit/delete buttons (Event Delegation)
  elements.listContainer.onclick = (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'edit') {
      handleEdit(id);
    } else if (action === 'delete') {
      handleDelete(id);
    }
  };
}

// ============================================
// 🔥 FIREBASE CRUD OPERATIONS
// ============================================

// ➕ Save Item (Add New or Update Existing)
async function saveItem(name, quantity, weight, id = null) {
  if (!isFirebaseReady) {
    showToast('❌ Firebase not ready! Check connection', 'error');
    return;
  }

  const btn = elements.addBtn;
  const originalText = elements.btnText ? elements.btnText.textContent : 'Save';

  try {
    // Show loading state
    if (btn) btn.disabled = true;
    if (elements.btnText) {
      elements.btnText.textContent = id ? 'Updating...' : 'Adding...';
    }

    const itemData = {
      name: name.trim(),
      quantity: parseInt(quantity) || 1,
      weight: weight.trim() || null,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      updatedAt: Date.now()
    };

    if (id) {
      // ✏️ Update existing item
      await db.ref(`groceryItems/${id}`).update(itemData);      console.log('📝 Updated item:', id);
      showToast('✅ Item updated successfully!', 'success');
    } else {
      // ➕ Add new item
      await db.ref('groceryItems').push(itemData);
      console.log('➕ Added new item');
      showToast('✅ Item added successfully!', 'success');
    }

    // Reset form
    if (elements.groceryForm) elements.groceryForm.reset();
    exitEditMode();

  } catch (error) {
    console.error('💥 Save Error:', error);

    let errorMsg = 'Failed to save item';

    if (error.code === 'PERMISSION_DENIED') {
      errorMsg = '❌ Permission Denied! Check Firebase Rules';
      showToast('Go to Firebase Console → Database → Rules → Set .read/.write to true', 'error', 6000);
    } else if (error.code === 'NETWORK_ERROR') {
      errorMsg = '📡 No Internet Connection';
    } else if (error.code === 'INVALID_TOKEN') {
      errorMsg = '🔐 Authentication Error';
    }

    showToast(errorMsg + ' ❌', 'error', 5000);

  } finally {
    // Restore button
    if (btn) btn.disabled = false;
    if (elements.btnText) {
      elements.btnText.textContent = originalText;
    }
  }
}

// ✏️ Handle Edit Button Click
function handleEdit(id) {
  if (!isFirebaseReady) {
    showToast('❌ Firebase not connected', 'error');
    return;
  }

  console.log('✏️ Editing item:', id);

  db.ref(`groceryItems/${id}`).once('value')
    .then(snapshot => {
      if (!snapshot.exists()) {        showToast('Item not found!', 'error');
        return;
      }

      const data = snapshot.val();

      // Fill form with existing data
      if (elements.itemName) elements.itemName.value = data.name || '';
      if (elements.itemQty) elements.itemQty.value = data.quantity || 1;
      if (elements.itemWeight) elements.itemWeight.value = data.weight || '';

      // Enable edit mode
      state.editMode = true;
      state.currentEditId = id;

      // Change button text & style
      if (elements.btnText) elements.btnText.textContent = '💾 Update Item';
      if (elements.addBtn) {
        elements.addBtn.classList.remove('btn-primary');
        elements.addBtn.classList.add('btn-secondary');
      }

      // Highlight form card
      if (elements.formCard) {
        elements.formCard.classList.add('edit-mode');

        // Show edit badge
        const existingBadge = document.getElementById('editBadge');
        if (!existingBadge) {
          const badge = document.createElement('div');
          badge.className = 'edit-badge';
          badge.innerHTML = '<i class="fas fa-edit"></i> Editing Mode';
          badge.id = 'editBadge';
          elements.formCard.insertBefore(badge, elements.groceryForm);
        }
      }

      // Focus on name field & scroll to form
      if (elements.itemName) {
        elements.itemName.focus();
        elements.formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      showToast('✏️ Edit mode - make changes & update!', 'warning');

    })
    .catch(error => {
      console.error('Edit fetch error:', error);
      showToast('Failed to load item for editing', 'error');
    });}

// 🔄 Exit Edit Mode
function exitEditMode() {
  state.editMode = false;
  state.currentEditId = null;

  if (elements.btnText) {
    elements.btnText.textContent = 'Add to List';
  }

  if (elements.addBtn) {
    elements.addBtn.classList.remove('btn-secondary');
    elements.addBtn.classList.add('btn-primary');
  }

  if (elements.formCard) {
    elements.formCard.classList.remove('edit-mode');
  }

  // Remove edit badge
  const badge = document.getElementById('editBadge');
  if (badge) badge.remove();
}

// 🗑️ Handle Delete Single Item
async function handleDelete(id) {
  if (!isFirebaseReady) {
    showToast('❌ Firebase not connected', 'error');
    return;
  }

  const confirmed = confirm('🗑️ Delete this item?\n\nThis cannot be undone.');
  if (!confirmed) return;

  try {
    await db.ref(`groceryItems/${id}`).remove();
    console.log('🗑️ Deleted item:', id);
    showToast('🗑️ Item deleted successfully!', 'success');
  } catch (error) {
    console.error('Delete error:', error);
    showToast('Failed to delete item', 'error');
  }
}

// 🗑️🗑️ Delete All Items
async function deleteAllItems() {
  if (!isFirebaseReady) {
    showToast('❌ Firebase not connected', 'error');
    return;  }

  const confirmed = confirm('⚠️ DANGER ZONE ⚠️\n\nDelete ALL items permanently?\n\nThis CANNOT be undone!');
  if (!confirmed) return;

  try {
    await db.ref('groceryItems').remove();
    console.log('🧹 Bulk deleted all items');
    showToast('🧹 All items cleared successfully!', 'success');
  } catch (error) {
    console.error('Bulk delete error:', error);
    showToast('Failed to delete all items', 'error');
  }
}

// ============================================
// 👂 EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
  // 📝 Form Submit Handler
  if (elements.groceryForm) {
    elements.groceryForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = elements.itemName ? elements.itemName.value.trim() : '';
      const quantity = elements.itemQty ? elements.itemQty.value.trim() : '';
      const weight = elements.itemWeight ? elements.itemWeight.value.trim() : '';

      // Validation
      if (!name) {
        showToast('⚠️ Please enter item name', 'warning');
        if (elements.itemName) elements.itemName.focus();
        return;
      }

      if (!quantity || parseInt(quantity) < 1) {
        showToast('⚠️ Quantity must be at least 1', 'warning');
        if (elements.itemQty) elements.itemQty.focus();
        return;
      }

      // Save to Firebase
      if (state.editMode && state.currentEditId) {
        saveItem(name, quantity, weight, state.currentEditId);
      } else {
        saveItem(name, quantity, weight);
      }
    });
  }
  // 🔄 Refresh Button
  if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener('click', () => {
      showToast('🔄 Refreshing list...', 'success', 1500);

      if (isFirebaseReady) {
        db.ref('groceryItems').once('value')
          .then(snapshot => {
            renderList(snapshot.val());
            setTimeout(() => showToast('✅ List refreshed!', 'success'), 1500);
          })
          .catch(err => {
            console.error('Refresh error:', err);
            showToast('Failed to refresh', 'error');
          });
      }
    });
  }

  // 🗑️ Delete All Button
  if (elements.deleteAllBtn) {
    elements.deleteAllBtn.addEventListener('click', deleteAllItems);
  }

  // ⌨️ Enter Key on Weight Field (Submit Form)
  if (elements.itemWeight) {
    elements.itemWeight.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (elements.groceryForm) {
          elements.groceryForm.requestSubmit();
        }
      }
    });
  }

  // 🚫 Cancel Edit Mode on Outside Click (Optional UX)
  document.addEventListener('click', (e) => {
    if (state.editMode && elements.formCard && !e.target.closest('.form-card')) {
      // Don't auto-cancel, but you can add this if needed:
      // exitEditMode();
    }
  });
}

// ============================================
// 👂 FIREBASE REAL-TIME LISTENER
// ============================================
function setupFirebaseListener() {
  if (!isFirebaseReady) {
    console.error('❌ Firebase not ready for listener');
    return;
  }

  const groceryRef = db.ref('groceryItems');

  // 📖 Listen for data changes (Real-time Sync)
  groceryRef.on('value',
    (snapshot) => {
      updateConnectionStatus(true, '✅ Connected to Firebase');
      renderList(snapshot.val());
    },
    (error) => {
      console.error('🔥 Firebase Listener Error:', error);
      updateConnectionStatus(false, '❌ Connection error');

      let errorMsg = 'Failed to load items';
      let errorDetail = error.message;

      if (error.code === 'PERMISSION_DENIED') {
        errorMsg = '🔐 Permission Denied!';
        errorDetail = 'Check Firebase Console → Database → Rules';
        showToast('Go to Firebase Rules & set .read/.write to true', 'error', 7000);
      }

      // Show error in list container
      if (elements.listContainer) {
        elements.listContainer.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p><strong>${errorMsg}</strong><br><small>${errorDetail}</small></p>
            <button class="btn btn-outline mt-2" id="retryBtn">
              <i class="fas fa-redo"></i> Try Again
            </button>
          </div>
        `;

        // Retry button handler
        document.getElementById('retryBtn')?.addEventListener('click', () => {
          location.reload();
        });
      }
    }
  );

  // 📡 Listen for connection state changes
  db.ref('.info/connected').on('value', (snapshot) => {
    const connected = snapshot.val() === true;
    if (!connected) {
      updateConnectionStatus(false, '📡 Offline - checking...');
    }
  });

  console.log('✅ Firebase Real-time Listener Active');
}

// ============================================
// 🚀 APP INITIALIZATION
// ============================================

function initApp() {
  console.log('🚀 Initializing Shalini Grocery App...');

  // Cache all DOM elements
  cacheElements();

  // Check if Firebase is ready
  if (!isFirebaseReady) {
    console.error('❌ Firebase not initialized');
    if (elements.listContainer) {
      elements.listContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p><strong>Firebase Connection Failed!</strong><br>Check console for details</p>
          <button class="btn btn-outline mt-2" onclick="location.reload()">
            <i class="fas fa-redo"></i> Retry
          </button>
        </div>
      `;
    }
    showToast('Firebase setup error! Check console 🔧', 'error', 6000);
    return;
  }

  // Setup all event listeners
  setupEventListeners();

  // Setup Firebase real-time listener
  setupFirebaseListener();

  // Welcome message
  setTimeout(() => {
    showToast('🛒 Welcome, Shalini! Start adding items ✨', 'success', 2500);
  }, 800);

  console.log('✅ App initialized successfully!');
  console.log('💪 Ready to manage your grocery list!');}

// ============================================
// 🎯 START APP WHEN DOM IS READY
// ============================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM already loaded
  initApp();
}

// ============================================
// 🛡️ SERVICE WORKER (For PWA - Optional)
// ============================================

if ('serviceWorker' in navigator) {
  // Uncomment to enable PWA later
  // navigator.serviceWorker.register('/sw.js');
  console.log('🔧 Service Worker ready for PWA upgrade');
}

// ============================================
// 📊 DEBUG INFO (Console)
// ============================================

console.log('=================================');
console.log('🛒 Shalini Grocery App Loaded!');
console.log('=================================');
console.log('📦 Firebase Ready:', isFirebaseReady);
console.log('🔗 Database URL:', firebaseConfig.databaseURL);
console.log('📱 Mobile Optimized: Yes');
console.log('=================================');

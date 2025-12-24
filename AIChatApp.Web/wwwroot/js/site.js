/**
 * site.js - Global UI Logic for AIChatApp
 */

function previewFile(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('imagePreview');
            if (preview) preview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function closeActionModal() {
    const modal = document.getElementById('action-modal');
    const container = document.getElementById('modal-container');

    if (container) {
        container.classList.add('scale-95', 'opacity-0');
    }

    setTimeout(() => {
        if (modal) modal.classList.add('hidden');
    }, 200);
}

/**
 * showSimpleToast - For one-way notifications (Success/Alerts)
 */
function showSimpleToast(title, message, type) {
    const modal = document.getElementById('action-modal');
    const container = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message-content');
    const actionBtn = document.getElementById('modal-action-button');
    const iconContainer = document.getElementById('modal-icon-container');
    const iconElement = document.getElementById('modal-icon-element');
    const cancelButton = document.getElementById('modal-cancel-button');

    if (!modal || !modalTitle || !modalMessage || !actionBtn) return;

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    actionBtn.textContent = "OK";

    // Hide cancel button for simple alerts
    if (cancelButton) cancelButton.classList.add('hidden');

    // Reset and Set Icon Theme
    iconContainer.className = "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ";
    actionBtn.className = "flex-1 py-4 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-[1.02] ";

    if (type === 'warning') {
        iconContainer.classList.add('bg-rose-50', 'text-rose-500');
        iconElement.className = "fa-solid fa-triangle-exclamation text-2xl";
        actionBtn.classList.add('bg-rose-600', 'shadow-rose-100');
    } else {
        iconContainer.classList.add('bg-emerald-50', 'text-emerald-500');
        iconElement.className = "fa-solid fa-circle-check text-2xl";
        actionBtn.classList.add('bg-emerald-600', 'shadow-emerald-100');
    }

    actionBtn.onclick = closeActionModal;

    // Show Modal
    modal.classList.remove('hidden');
    setTimeout(() => {
        container.classList.remove('scale-95', 'opacity-0');
        container.classList.add('scale-100', 'opacity-100');
    }, 10);
}

/**
 * showActionModal - For interactive confirmations (Logout/Deletions)
 */
function showActionModal(options) {
    const modal = document.getElementById('action-modal');
    const container = document.getElementById('modal-container');
    const title = document.getElementById('modal-title');
    const message = document.getElementById('modal-message-content');
    const actionBtn = document.getElementById('modal-action-button');
    const iconContainer = document.getElementById('modal-icon-container');
    const iconElement = document.getElementById('modal-icon-element');
    const cancelButton = document.getElementById('modal-cancel-button');

    if (!modal) return;

    title.textContent = options.title || "Confirm";
    message.textContent = options.message || "";
    actionBtn.textContent = options.actionText || "Confirm";

    // Show cancel button for interactions
    if (cancelButton) cancelButton.classList.remove('hidden');

    // Reset and Set Icon Theme
    iconContainer.className = "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ";
    actionBtn.className = "flex-1 py-4 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-[1.02] ";

    if (options.type === 'warning' || options.type === 'logout') {
        iconContainer.classList.add('bg-rose-50', 'text-rose-500');
        iconElement.className = options.type === 'logout' ? "fa-solid fa-right-from-bracket text-2xl" : "fa-solid fa-triangle-exclamation text-2xl";
        actionBtn.classList.add('bg-indigo-600', 'shadow-indigo-100');
    } else {
        iconContainer.classList.add('bg-indigo-50', 'text-indigo-600');
        iconElement.className = "fa-solid fa-circle-info text-2xl";
        actionBtn.classList.add('bg-indigo-600', 'shadow-indigo-100');
    }

    actionBtn.onclick = function () {
        closeActionModal();
        if (options.onAction) options.onAction();
    };

    modal.classList.remove('hidden');
    setTimeout(() => {
        container.classList.remove('scale-95', 'opacity-0');
        container.classList.add('scale-100', 'opacity-100');
    }, 10);
}

/**
 * confirmLogout - Specifically wired to the Logout Form
 */
function confirmLogout(event) {
    if (event) event.preventDefault();
    const form = document.getElementById('logoutForm');
    if (!form) return;

    showActionModal({
        title: 'Sign Out',
        message: 'Are you sure you want to end your session?',
        type: 'logout',
        actionText: 'Yes, Logout',
        onAction: function () {
            form.submit();
        }
    });
}
"use strict";

const chatListUI = (function () {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/chatHub")
        .withAutomaticReconnect()
        .build();

    // Elements
    const unreadSection = document.getElementById('unread-section');
    const recentSection = document.getElementById('recent-section');
    const unreadWrapper = document.getElementById('unread-wrapper');

    const updateRow = (senderId, message, time) => {
        // 1. Find the row - ensure senderId is lowercase to match Guid.ToString()
        const row = document.getElementById(`chat-row-${senderId.toLowerCase()}`);

        if (!row) {
            // If the row doesn't exist, it's a new conversation. 
            // We should probably reload the list or fetch a new partial.
            console.warn("Row not found for sender:", senderId);
            return;
        }

        // 2. Update Text & Bold it (using your Tailwind classes)
        const preview = document.getElementById(`message-preview-${senderId.toLowerCase()}`);
        if (preview) {
            preview.innerText = message;
            preview.classList.remove('text-gray-500');
            preview.classList.add('font-bold', 'text-gray-950');
        }

        // 3. Update Badge
        const badge = document.getElementById(`unread-badge-${senderId.toLowerCase()}`);
        if (badge) {
            let count = parseInt(badge.innerText.trim()) || 0;
            badge.innerText = count + 1;
            badge.classList.remove('hidden');
        }

        // 4. Update Time
        const timeLabel = document.getElementById(`message-time-${senderId.toLowerCase()}`);
        if (timeLabel) timeLabel.innerText = time;

        // 5. Move to Unread Section
        const unreadSection = document.getElementById('unread-section');
        const unreadWrapper = document.getElementById('unread-wrapper');

        if (unreadSection && unreadWrapper) {
            unreadWrapper.classList.remove('hidden');
            unreadSection.prepend(row); // Moves the existing row to the top
        }
    };

    const markAsReadUI = (senderId) => {
        const row = document.getElementById(`chat-row-${senderId}`);
        if (!row) return;

        // Reset Styles
        const preview = document.getElementById(`message-preview-${senderId}`);
        preview.classList.add('text-gray-500');
        preview.classList.remove('font-bold', 'text-gray-950');

        // Reset Badge
        const badge = document.getElementById(`unread-badge-${senderId}`);
        badge.innerText = "0";
        badge.classList.add('hidden');

        // Move to Recent
        recentSection.prepend(row);

        // Hide unread section header if empty
        if (unreadSection.children.length === 0) {
            unreadWrapper.classList.add('hidden');
        }
    };

    connection.on("ReceiveMessage", (data) => {
        // Check if there is a global variable or hidden input indicating 
        // the currently open chat window
        const currentOpenedChatId = document.getElementById('CurrentChatUserId')?.value;

        if (currentOpenedChatId === data.senderId) {
            // User is currently chatting with this person. 
            // Don't show unread badge, just update the preview text.
            updateRowTextOnly(data.senderId, data.message);
            // Optionally notify server that we read it immediately
            connection.invoke("MarkAsRead", data.senderId);
        } else {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            updateRow(data.senderId, data.message, timeStr);
        }
    });

    connection.on("MessagesRead", (senderId) => {
        markAsReadUI(senderId);
    });

    // Start
    connection.start().catch(err => console.error("SignalR Connection Error: ", err));

    return {
        // Public methods if needed
    };
})();
// Chat functionality with Tailwind CSS
(function () {
    const currentUserId = document.getElementById('currentUserId').value;
    const chatUserId = document.getElementById('chatUserId').value;
    let connection;
    let typingTimeout;

    console.log("Chat initialized with:", { currentUserId, chatUserId });

    // Auto-resize textarea
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    // Initialize SignalR connection
    async function initializeChat() {
        connection = new signalR.HubConnectionBuilder()
            .withUrl("/chatHub")
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        // Receive messages (from other user)
        connection.on("ReceiveMessage", function (data) {
            console.log("Message received:", data);
            if (data.senderId === chatUserId) {
                appendMessage(data.message, false, data.sentAt, data.id);
                scrollToBottom();

                // Mark as read immediately
                connection.invoke("MarkAsRead", chatUserId)
                    .catch(err => console.error("Mark as read error:", err));
            }
        });

        // Message sent confirmation from server (for messages we sent)
        // Server should send { id, senderId, sentAt, message } or similar
        connection.on("MessageSent", function (data) {
            console.log("Message sent confirmation:", data);

            // If the confirmation is for the current user, match the client-temp element
            if (data.senderId === currentUserId) {
                // Match by temporary attribute and content (best-effort)
                const messagesDiv = document.getElementById("chatMessages");
                const tempEls = messagesDiv.querySelectorAll("[data-client-temp='true']");
                // Prefer most recent
                for (let i = tempEls.length - 1; i >= 0; i--) {
                    const el = tempEls[i];
                    const textEl = el.querySelector(".message-text");
                    if (!textEl) continue;

                    // Try to match by text
                    if (textEl.textContent.trim() === data.message.trim()) {
                        el.setAttribute("data-message-id", data.id);
                        el.removeAttribute("data-client-temp");
                        // update timestamp and status
                        const timeSpan = el.querySelector(".text-xs.text-gray-500");
                        if (timeSpan) timeSpan.textContent = new Date(data.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const status = el.querySelector(".message-status");
                        if (status) status.setAttribute("data-status", "sent");
                        break;
                    }
                }
            }
        });

        // Messages read - update all messages to "Seen"
        connection.on("MessagesRead", function (userId) {
            console.log("Messages read by:", userId);
            if (userId === chatUserId) {
                markAllAsSeen();
            }
        });

        // Message edited by someone (server broadcasts)
        connection.on("MessageEdited", function (data) {
            // data: { id, message, editedAt }
            const el = document.querySelector(`[data-message-id='${data.id}']`);
            if (el) {
                const textEl = el.querySelector(".message-text");
                if (textEl) {
                    textEl.textContent = data.message;
                }
                // show small 'edited' indicator (optional)
                let editedEl = el.querySelector(".edited-indicator");
                if (!editedEl) {
                    editedEl = document.createElement("span");
                    editedEl.className = "edited-indicator text-xs text-gray-400 ml-2";
                    editedEl.textContent = "edited";
                    const meta = el.querySelector(".flex.items-center");
                    if (meta) meta.appendChild(editedEl);
                }
            }
        });

        // Message deleted by someone (server broadcasts)
        connection.on("MessageDeleted", function (messageId) {
            // Remove message element
            const el = document.querySelector(`[data-message-id='${messageId}']`);
            if (el) {
                el.remove();
            }
        });

        // User typing indicator
        connection.on("UserTyping", function (userId) {
            if (userId === chatUserId) {
                showTypingIndicator();
            }
        });

        // Online/Offline status
        connection.on("UserOnline", function (userId) {
            if (userId === chatUserId) {
                updateUserStatus(true);
            }
        });

        connection.on("UserOffline", function (userId) {
            if (userId === chatUserId) {
                updateUserStatus(false);
            }
        });

        // Connection state handlers
        connection.onreconnecting(error => {
            console.warn("Connection lost, reconnecting...", error);
        });

        connection.onreconnected(connectionId => {
            console.log("Reconnected with ID:", connectionId);
        });

        connection.onclose(error => {
            console.error("Connection closed:", error);
            setTimeout(initializeChat, 5000);
        });

        try {
            await connection.start();
            console.log("SignalR Connected successfully!", connection.connectionId);

            // Mark existing messages as read
            await connection.invoke("MarkAsRead", chatUserId);
        } catch (err) {
            console.error("SignalR Connection Error:", err);
            showNotification("Failed to connect to chat server. Please refresh the page.", "error");
            setTimeout(initializeChat, 5000);
        }
    }

    // Send message
    document.getElementById("sendButton").addEventListener("click", sendMessage);
    messageInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage() {
        const message = messageInput.value.trim();

        if (message === "") return;

        // Check connection state
        if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
            showNotification("Not connected to chat server. Reconnecting...", "warning");
            await initializeChat();
            return;
        }

        try {
            console.log("Sending message:", { chatUserId, message });
            await connection.invoke("SendMessage", chatUserId, message);
            console.log("Message sent successfully");

            // Append client-temp message (will be patched when server confirms)
            appendMessage(message, true, new Date().toISOString(), null, false, true);
            messageInput.value = "";
            messageInput.style.height = 'auto';
            scrollToBottom();
        } catch (err) {
            console.error("Send Error Details:", err);
            showNotification("Failed to send message. Please try again.", "error");
        }
    }

    // Typing indicator
    messageInput.addEventListener("input", function () {
        clearTimeout(typingTimeout);

        if (connection && connection.state === signalR.HubConnectionState.Connected) {
            connection.invoke("UserTyping", chatUserId)
                .catch(err => console.error("Typing indicator error:", err));
        }

        typingTimeout = setTimeout(() => {
            // Stop typing indicator after 3 seconds
        }, 3000);
    });

    // Helper functions
    function appendMessage(text, isSent, timestamp, messageId, isRead = false, isTemp = false) {
        const messagesDiv = document.getElementById("chatMessages");
        const messageDiv = document.createElement("div");
        messageDiv.className = `flex ${isSent ? "justify-end" : "justify-start"} animate-fadeIn`;
        if (messageId) messageDiv.setAttribute("data-message-id", messageId);
        if (isTemp) {
            messageDiv.setAttribute("data-client-temp", "true");
        }

        const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let statusIcon = '';
        if (isSent) {
            if (isRead) {
                // Double checkmark for seen
                statusIcon = `
                <span class="message-status" data-status="seen">
                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 13l4 4L23 7"/>
                    </svg>
                </span>
            `;
            } else {
                // Single checkmark for sent
                statusIcon = `
                <span class="message-status" data-status="sent">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                </span>
            `;
            }
        }

        if (isSent) {
            // Options and action menu present only for own messages
            messageDiv.innerHTML = `
            <div class="max-w-[70%] group relative">
                <div class="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-md hover:shadow-lg transition-shadow">
                    <p class="text-sm leading-relaxed break-words message-text">${escapeHtml(text)}</p>
                </div>

                <button type="button"
                        class="message-options-btn absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white/90 text-gray-600 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        ${messageId ? `data-message-id="${messageId}"` : ''}
                        aria-haspopup="true"
                        aria-expanded="false"
                        title="Message options">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v.01M12 12v.01M12 18v.01" />
                    </svg>
                </button>

                <div class="message-actions hidden absolute top-full right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-100 z-20">
                    <button type="button" class="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm edit-message-btn" ${messageId ? `data-message-id="${messageId}"` : ''}>Edit</button>
                    <button type="button" class="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-red-600 delete-message-btn" ${messageId ? `data-message-id="${messageId}"` : ''}>Delete</button>
                </div>

                <div class="flex items-center justify-end gap-1.5 mt-1 px-2">
                    <span class="text-xs text-gray-500">${time}</span>
                    ${statusIcon}
                </div>
            </div>
        `;
        } else {
            messageDiv.innerHTML = `
            <div class="max-w-[70%] group">
                <div class="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow">
                    <p class="text-sm text-gray-800 leading-relaxed break-words message-text">${escapeHtml(text)}</p>
                </div>
                <div class="flex items-center gap-1.5 mt-1 px-2">
                    <span class="text-xs text-gray-500">${time}</span>
                </div>
            </div>
        `;
        }

        messagesDiv.appendChild(messageDiv);
    }

    // Event delegation for message options, edit and delete
    document.getElementById('chatMessages').addEventListener('click', function (e) {
        const optionsBtn = e.target.closest('.message-options-btn');
        if (optionsBtn) {
            const container = optionsBtn.closest('.group') || optionsBtn.closest('[data-message-id]');
            const menu = container.querySelector('.message-actions');
            if (menu) {
                const expanded = optionsBtn.getAttribute('aria-expanded') === 'true';
                // close other open menus
                document.querySelectorAll('.message-actions').forEach(m => {
                    if (m !== menu) m.classList.add('hidden');
                });
                const buttons = document.querySelectorAll('.message-options-btn');
                buttons.forEach(b => b.setAttribute('aria-expanded', 'false'));

                if (expanded) {
                    menu.classList.add('hidden');
                    optionsBtn.setAttribute('aria-expanded', 'false');
                } else {
                    menu.classList.remove('hidden');
                    optionsBtn.setAttribute('aria-expanded', 'true');
                }
            }
            return;
        }

        // Edit button clicked
        const editBtn = e.target.closest('.edit-message-btn');
        if (editBtn) {
            const messageId = editBtn.getAttribute('data-message-id') || editBtn.closest('[data-message-id]')?.getAttribute('data-message-id');
            const messageEl = editBtn.closest('[data-message-id]') || editBtn.closest('.group');
            startInlineEdit(messageEl, messageId);
            return;
        }

        // Delete button clicked
        const deleteBtn = e.target.closest('.delete-message-btn');
        if (deleteBtn) {
            const messageId = deleteBtn.getAttribute('data-message-id') || deleteBtn.closest('[data-message-id]')?.getAttribute('data-message-id');
            const messageEl = deleteBtn.closest('[data-message-id]') || deleteBtn.closest('.group');
            confirmDeleteMessage(messageEl, messageId);
            return;
        }

        // Clicking outside menus -> close any open
        if (!e.target.closest('.message-actions') && !e.target.closest('.message-options-btn')) {
            document.querySelectorAll('.message-actions').forEach(m => m.classList.add('hidden'));
            document.querySelectorAll('.message-options-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
        }
    });

    function startInlineEdit(messageContainer, messageId) {
        if (!messageContainer || !messageId) return;
        const textEl = messageContainer.querySelector('.message-text');
        if (!textEl) return;

        // Prevent opening multiple editors
        if (messageContainer.classList.contains('message-editing')) return;

        const originalText = textEl.textContent.trim();
        messageContainer.classList.add('message-editing');

        // Replace with textarea
        const textarea = document.createElement('textarea');
        textarea.className = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none message-edit-textarea';
        textarea.value = originalText;
        textarea.rows = 3;
        textarea.style.minHeight = '56px';
        textarea.style.maxHeight = '120px';

        // action row
        const actionRow = document.createElement('div');
        actionRow.className = 'mt-2 flex justify-end gap-2';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'inline-flex items-center justify-center rounded-md bg-black px-3 py-1 text-sm font-semibold text-white hover:bg-gray-800';
        saveBtn.textContent = 'Save';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50';
        cancelBtn.textContent = 'Cancel';

        actionRow.appendChild(cancelBtn);
        actionRow.appendChild(saveBtn);

        // hide original paragraph and insert editor
        textEl.style.display = 'none';
        const bubble = messageContainer.querySelector('div > .message-text')?.parentElement || textEl.parentElement;
        bubble.appendChild(textarea);
        bubble.appendChild(actionRow);

        // Cancel handler
        cancelBtn.addEventListener('click', function () {
            textarea.remove();
            actionRow.remove();
            textEl.style.display = '';
            messageContainer.classList.remove('message-editing');
        });

        // Save handler
        saveBtn.addEventListener('click', async function () {
            const newText = textarea.value.trim();
            if (newText === '') {
                showNotification("Message cannot be empty", "warning");
                return;
            }

            // invoke server edit
            try {
                await connection.invoke("EditMessage", messageId, newText);
                // optimistic update (server will broadcast MessageEdited too)
                textEl.textContent = newText;
                textarea.remove();
                actionRow.remove();
                textEl.style.display = '';
                messageContainer.classList.remove('message-editing');
            } catch (err) {
                console.error("Edit failed:", err);
                showNotification("Failed to edit message", "error");
            }
        });
    }

    function confirmDeleteMessage(messageContainer, messageId) {
        if (!messageContainer || !messageId) return;
        if (!confirm("Delete this message? This action cannot be undone.")) return;

        // invoke server delete
        connection.invoke("DeleteMessage", messageId)
            .then(() => {
                // optimistic remove (server will broadcast MessageDeleted too)
                messageContainer.remove();
            })
            .catch(err => {
                console.error("Delete failed:", err);
                showNotification("Failed to delete message", "error");
            });
    }

    function scrollToBottom() {
        const messagesDiv = document.getElementById("chatMessages");
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function showTypingIndicator() {
        const indicator = document.getElementById("typingIndicator");
        indicator.classList.remove("hidden");

        setTimeout(() => {
            indicator.classList.add("hidden");
        }, 3000);
    }

    function updateUserStatus(isOnline) {
        const statusIndicator = document.getElementById("userStatus");
        if (isOnline) {
            statusIndicator.className = "absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full";
        } else {
            statusIndicator.className = "absolute bottom-0 right-0 w-3 h-3 bg-gray-400 border-2 border-white rounded-full";
        }
    }

    function markAllAsSeen() {
        // Update all sent messages to "Seen"
        document.querySelectorAll(".message-status[data-status='sent']").forEach(statusSpan => {
            statusSpan.setAttribute("data-status", "seen");
            statusSpan.innerHTML = `
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 13l4 4L23 7"/>
            </svg>
        `;
        });
    }

    function showNotification(message, type = "info") {
        // Simple notification using browser alert
        console.log(`[${type.toUpperCase()}] ${message}`);
        if (type === "error") {
            alert(message);
        }
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize on page load
    initializeChat();
    scrollToBottom();
})();
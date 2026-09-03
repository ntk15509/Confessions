/* 
    03/09/2026
*/

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzQW25_w_EmNgBsBR2Ud7_dj2Ev6hwjp-G3qLqLwWARGHuCFRin9MOrIeLkRkSuIc8aYg/exec";
const LIKED_KEY = "nhs_liked_uuids_v1"; 
const MAX_LENGTH = 20000;

const form = document.querySelector("#confession_form");
const input = document.querySelector("#confession_input");
const errorBox = document.querySelector("#form_error");
const list = document.querySelector("#confession_list");
const searchInput = document.querySelector("#search_input");
const searchDateInput = document.querySelector("#search_date_input");
const backdrop = document.querySelector("#confession_backdrop");

let likedIds = loadLikedIds();
let currentConfessions = [];
let activeOpenUuid = null; // Replaced activeOpenRowId with activeOpenUuid
let lastRawDataString = "";
let searchQuery = "";
let searchDateQuery = "";

// --- Xử lý Dark/Light Mode ---
const themeToggleBtn = document.querySelector("#theme_toggle_btn");
const themeText = themeToggleBtn ? themeToggleBtn.querySelector(".theme_text") : null;
const userTheme = localStorage.getItem("nhs_theme");

if (userTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    if (themeToggleBtn) {
        themeToggleBtn.querySelector("i").className = "fa-solid fa-sun";
        if (themeText) themeText.textContent = "Chế độ sáng";
    }
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const icon = themeToggleBtn.querySelector("i");

        if (currentTheme === "dark") {
            document.documentElement.removeAttribute("data-theme");
            localStorage.setItem("nhs_theme", "light");
            icon.className = "fa-solid fa-moon";
            if (themeText) themeText.textContent = "Chế độ tối";
        } else {
            document.documentElement.setAttribute("data-theme", "dark");
            localStorage.setItem("nhs_theme", "dark");
            icon.className = "fa-solid fa-sun";
            if (themeText) themeText.textContent = "Chế độ sáng";
        }
    });
}

// --- Xử lý Modal README ---
const readmeToggleBtn = document.querySelector("#readme_toggle_btn");
const readmeModal = document.querySelector("#readme_modal");
const closeReadmeBtn = document.querySelector("#close_readme_btn");

if (readmeToggleBtn && readmeModal) {
    readmeToggleBtn.addEventListener("click", () => {
        readmeModal.classList.add("active");
        document.body.classList.add("confession-modal-open");
    });
}

function closeReadme() {
    if (readmeModal) {
        readmeModal.classList.remove("active");
        if (!activeOpenUuid) {
            document.body.classList.remove("confession-modal-open");
        }
    }
}

if (closeReadmeBtn) {
    closeReadmeBtn.addEventListener("click", closeReadme);
}

if (readmeModal) {
    readmeModal.addEventListener("click", (e) => {
        if (e.target === readmeModal) {
            closeReadme();
        }
    });
}

if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.trim();
        renderAll();
    });
}

if (searchDateInput) {
    searchDateInput.addEventListener("input", (e) => {
        searchDateQuery = e.target.value.trim();
        renderAll();
    });
}

function loadLikedIds() {
    const raw = localStorage.getItem(LIKED_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (e) {
        return [];
    }
}

function saveLikedIds(ids) {
    localStorage.setItem(LIKED_KEY, JSON.stringify(ids.map(String)));
}

function formatTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;
    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDateOnly(timestamp) {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Khác";

    return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function renderComment(comment) {
    const item = document.createElement("div");
    item.className = "comment_item";
    
    if (typeof comment === "object" && comment !== null) {
        const content = comment.content || "";
        const timeStr = comment.time ? formatTime(comment.time) : "";
        item.innerHTML = `<span class="comment_text">${content}</span>${timeStr ? `<span class="comment_time" style="font-size: 0.8em; color: #888; margin-left: 8px;">${timeStr}</span>` : ""}`;
    } else {
        item.textContent = comment;
    }
    return item;
}

const sharedEmojiListHTML = `
    <div class="emoji_picker">
        <span class="emoji_item" data-emoji="😊">😊</span>
        <span class="emoji_item" data-emoji="😂">😂</span>
        <span class="emoji_item" data-emoji="🥺">🥺</span>
        <span class="emoji_item" data-emoji="😍">😍</span>
        <span class="emoji_item" data-emoji="🥰">🥰</span>
        <span class="emoji_item" data-emoji="😎">😎</span>
        <span class="emoji_item" data-emoji="🤔">🤔</span>
        <span class="emoji_item" data-emoji="😅">😅</span>
        <span class="emoji_item" data-emoji="😆">😆</span>
        <span class="emoji_item" data-emoji="😉">😉</span>
        <span class="emoji_item" data-emoji="😘">😘</span>
        <span class="emoji_item" data-emoji="😜">😜</span>
        <span class="emoji_item" data-emoji="🤫">🤫</span>
        <span class="emoji_item" data-emoji="🤩">🤩</span>
        <span class="emoji_item" data-emoji="😏">😏</span>
        <span class="emoji_item" data-emoji="😴">😴</span>
        <span class="emoji_item" data-emoji="🥳">🥳</span>
        <span class="emoji_item" data-emoji="😢">😢</span>
        <span class="emoji_item" data-emoji="😭">😭</span>
        <span class="emoji_item" data-emoji="😡">😡</span>
        <span class="emoji_item" data-emoji="👍">👍</span>
        <span class="emoji_item" data-emoji="👎">👎</span>
        <span class="emoji_item" data-emoji="👏">👏</span>
        <span class="emoji_item" data-emoji="🙏">🙏</span>
        <span class="emoji_item" data-emoji="🔥">🔥</span>
        <span class="emoji_item" data-emoji="❤️">❤️</span>
        <span class="emoji_item" data-emoji="💖">💖</span>
        <span class="emoji_item" data-emoji="✨">✨</span>
        <span class="emoji_item" data-emoji="🎉">🎉</span>
        <span class="emoji_item" data-emoji="💯">💯</span>
        <span class="emoji_item" data-emoji="☕">☕</span>
        <span class="emoji_item" data-emoji="📌">📌</span>
    </div>
`;

function updateOrRenderBox(confession) {
    const uuid = String(confession.uuid);
    let box = list.querySelector(`.box[data-uuid="${uuid}"]`);
    const isLiked = likedIds.includes(uuid);

    if (!box) {
        box = document.createElement("div");
        box.className = "box";
        box.dataset.uuid = uuid;

        box.innerHTML = `
            <button type="button" class="close_modal_btn" title="Đóng"><i class="fa-solid fa-xmark"></i></button>
            <div class="confession_title">Confession #${String(confession.number).padStart(3, "0")}</div>
            <div class="confession_content">
                <p></p>
                <button type="button" class="read_more_btn">Xem thêm</button>
            </div>
            <div class="confession_meta"><span class="confession_time"></span></div>
            <div class="confession_actions">
                <button type="button" class="heart_btn"></button>
                <button type="button" class="comment_toggle"></button>
            </div>
            <div class="comments_section" hidden>
                <div class="comment_list"></div>
                <div class="comment_form_wrapper">
                    <form class="comment_form">
                        <textarea class="comment_input" rows="1" placeholder="Viết bình luận... (Nhấn Enter để xuống dòng)" maxlength="20000"></textarea>
                        <button type="button" class="comment_emoji_btn" title="Chọn biểu cảm"><i class="fa-regular fa-face-smile"></i></button>
                        <button type="submit" class="comment_submit">Gửi</button>
                    </form>
                    <div class="emoji_picker_container comment_emoji_container" style="display: none;">
                        ${sharedEmojiListHTML}
                    </div>
                </div>
            </div>
        `;

        const heartBtn = box.querySelector(".heart_btn");
        heartBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleLike(confession.uuid);
        });

        const readMoreBtn = box.querySelector(".read_more_btn");
        readMoreBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleCommentsHandler();
        });

        const toggleCommentsHandler = () => {
            const commentsSection = box.querySelector(".comments_section");
            const isOpening = commentsSection.hidden;

            if (isOpening) {
                if (activeOpenUuid && activeOpenUuid !== uuid) {
                    const prevBox = list.querySelector(`.box[data-uuid="${activeOpenUuid}"]`);
                    if (prevBox) {
                        const prevSection = prevBox.querySelector(".comments_section");
                        if (prevSection) prevSection.hidden = true;
                        prevBox.classList.remove("expanded", "modal_focused");
                    }
                }

                commentsSection.hidden = false;
                box.classList.add("expanded", "modal_focused");
                if (backdrop) backdrop.classList.add("active");
                document.body.classList.add("confession-modal-open");
                
                activeOpenUuid = uuid;
            }
        };

        function closeActiveModal() {
            if (!activeOpenUuid) return;
            const activeBox = list.querySelector(`.box[data-uuid="${activeOpenUuid}"]`);
            if (activeBox) {
                const commentsSection = activeBox.querySelector(".comments_section");
                if (commentsSection) commentsSection.hidden = true;
                activeBox.classList.remove("expanded", "modal_focused");
            }
            if (backdrop) backdrop.classList.remove("active");
            document.body.classList.remove("confession-modal-open");
            activeOpenUuid = null;
        }

        const closeBtn = box.querySelector(".close_modal_btn");
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            closeActiveModal();
        });

        box.addEventListener("click", toggleCommentsHandler);

        const commentsSection = box.querySelector(".comments_section");
        commentsSection.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        const commentInput = box.querySelector(".comment_input");
        const commentEmojiBtn = box.querySelector(".comment_emoji_btn");
        const commentEmojiContainer = box.querySelector(".comment_emoji_container");

        commentEmojiBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isVisible = commentEmojiContainer.style.display === "block";
            commentEmojiContainer.style.display = isVisible ? "none" : "block";
        });

        commentEmojiContainer.querySelectorAll(".emoji_item").forEach((item) => {
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                const emoji = item.getAttribute("data-emoji");
                const startPos = commentInput.selectionStart;
                const endPos = commentInput.selectionEnd;
                const text = commentInput.value;

                commentInput.value = text.substring(0, startPos) + emoji + text.substring(endPos);
                commentInput.selectionStart = commentInput.selectionEnd = startPos + emoji.length;
                commentInput.focus();
            });
        });

        const commentForm = box.querySelector(".comment_form");
        const commentSubmitBtn = box.querySelector(".comment_submit");

        commentForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const text = commentInput.value.trim();
            if (!text) return;
            
            commentEmojiContainer.style.display = "none";
            await addComment(confession.uuid, text, commentSubmitBtn, commentInput);
        });
    }

    const isOpen = (activeOpenUuid === uuid);
    const pEl = box.querySelector(".confession_content p");
    pEl.textContent = confession.content;

    const readMoreBtn = box.querySelector(".read_more_btn");
    
    requestAnimationFrame(() => {
        const isOverflowing = pEl.scrollHeight > pEl.clientHeight || confession.content.length > 120;
        if (!isOverflowing && !isOpen) {
            readMoreBtn.style.display = "none";
        } else {
            readMoreBtn.style.display = "inline-block";
            readMoreBtn.textContent = "Xem thêm";
        }
    });

    box.querySelector(".confession_time").textContent = formatTime(confession.time);

    const heartBtn = box.querySelector(".heart_btn");
    heartBtn.className = "heart_btn" + (isLiked ? " liked" : "");
    heartBtn.innerHTML = `${isLiked ? "❤️" : "🤍"} <span class="heart_count">${confession.likes}</span>`;

    const commentToggle = box.querySelector(".comment_toggle");
    commentToggle.textContent = `💬 Bình luận (${confession.comments.length})`;

    const commentsSection = box.querySelector(".comments_section");
    commentsSection.hidden = !isOpen;
    if (isOpen) {
        box.classList.add("expanded", "modal_focused");
    } else {
        box.classList.remove("expanded", "modal_focused");
    }

    const commentList = box.querySelector(".comment_list");
    commentList.innerHTML = "";
    confession.comments.forEach((c) => {
        commentList.appendChild(renderComment(c));
    });

    return box;
}

function renderAll() {
    let filteredConfessions = currentConfessions.filter((c) => {
        if (searchQuery) {
            const queryNum = searchQuery.replace("#", "").trim();
            if (queryNum) {
                const formattedNumStr = String(c.number).padStart(3, "0");
                const displayNumStr = String(c.number);
                const matchId = formattedNumStr.includes(queryNum) || displayNumStr.includes(queryNum);
                if (!matchId) return false;
            }
        }

        if (searchDateQuery) {
            if (!searchDateQuery.startsWith("#")) {
                return false; 
            }
            const cleanDateQuery = searchDateQuery.replace("#", "").trim();
            if (cleanDateQuery) {
                const dateStr = c.time ? formatDateOnly(c.time) : "";
                if (!dateStr.toLowerCase().includes(cleanDateQuery.toLowerCase())) {
                    return false;
                }
            }
        }

        return true;
    });

    if (filteredConfessions.length === 0) {
        if (currentConfessions.length === 0) {
            list.innerHTML = "<p style='text-align:center; color:var(--text-muted); padding:20px;'>Chưa có bài viết nào được phê duyệt.</p>";
        } else {
            list.innerHTML = `<p style='text-align:center; color:var(--text-muted); padding:20px;'>Không tìm thấy bài viết phù hợp với điều kiện tìm kiếm.</p>`;
        }
        return;
    }

    filteredConfessions.sort((a, b) => b.number - a.number);
    list.innerHTML = "";

    const groups = {};
    filteredConfessions.forEach((c) => {
        const dateKey = c.time ? formatDateOnly(c.time) : "Khác";
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(c);
    });

    Object.keys(groups).forEach((dateStr) => {
        const dateBlock = document.createElement("div");
        dateBlock.className = "date_block";

        const dateHeader = document.createElement("div");
        dateHeader.className = "date_block_header";
        dateHeader.innerHTML = `📅 Ngày ${dateStr}`;
        dateBlock.appendChild(dateHeader);

        const gridContainer = document.createElement("div");
        gridContainer.className = "date_block_grid";

        groups[dateStr].forEach((c) => {
            const box = updateOrRenderBox(c);
            gridContainer.appendChild(box);
        });

        dateBlock.appendChild(gridContainer);
        list.appendChild(dateBlock);
    });
}

async function loadApprovedConfessions() {
    try {
        const response = await fetch(SCRIPT_URL + "?t=" + Date.now());
        if (!response.ok) throw new Error("Máy chủ phản hồi lỗi.");
        const data = await response.json();
        
        if (!Array.isArray(data)) throw new Error("Dữ liệu không đúng định dạng.");

        const rawString = JSON.stringify(data);
        if (rawString === lastRawDataString) return;
        lastRawDataString = rawString;

        currentConfessions = data.map((item, index) => {
            const uuid = String(item.uuid);
            const existing = currentConfessions.find(c => String(c.uuid) === uuid);
            const serverLikes = Number(item.likes) || 0;
            const likes = existing ? Math.max(existing.likes, serverLikes) : serverLikes;

            return {
                uuid: item.uuid,
                number: index + 1,
                content: item.content || "",
                time: item.time,
                likes: likes,
                comments: item.comments || []
            };
        });

        renderAll();
    } catch (err) {
        console.error("Lỗi tải dữ liệu confession:", err);
        if (list.innerHTML === "") {
            list.innerHTML = `<p style='text-align:center; color:var(--text-muted); padding:20px;'>
                <i class="fa-solid fa-triangle-exclamation" style="color:var(--primary-color);"></i> Không thể tải danh sách bài viết từ máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau!
            </p>`;
        }
    }
}

async function toggleLike(uuid) {
    const strUuid = String(uuid);
    if (likedIds.includes(strUuid)) return;

    likedIds.push(strUuid);
    saveLikedIds(likedIds);

    const confession = currentConfessions.find(c => String(c.uuid) === strUuid);
    if (confession) {
        confession.likes = (confession.likes || 0) + 1;
        renderAll();
    }

    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "like", uuid: strUuid })
        });
    } catch (err) {
        console.error("Lỗi cập nhật lượt thích:", err);
    }
}

async function addComment(uuid, text, submitBtn, commentInput) {
    const strUuid = String(uuid);
    const confession = currentConfessions.find(c => String(c.uuid) === strUuid);
    
    // 1. Hiển thị ngay lập tức lên giao diện
    const tempComment = {
        content: text,
        time: new Date().toISOString()
    };

    if (confession) {
        if (!confession.comments) confession.comments = [];
        confession.comments.push(tempComment);
        updateOrRenderBox(confession);
    }

    commentInput.value = "";
    commentInput.style.height = "46px";

    // 2. Tạo bản gửi lên Server
    let serverSendText = text;
    if (serverSendText.startsWith("=")) {
        serverSendText = "'" + serverSendText;
    }

    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "comment", uuid: strUuid, content: serverSendText })
        });
        
        // Delay 1.5 giây để server lưu xong vào Sheets, sau đó mới đồng bộ lại dữ liệu
        setTimeout(async () => {
            lastRawDataString = "";
            await loadApprovedConfessions();
        }, 1500);

    } catch (err) {
        console.error("Lỗi gửi bình luận:", err);
        alert("Không thể gửi bình luận do lỗi kết nối. Vui lòng thử lại sau!");
        await loadApprovedConfessions();
    }
}

const feedbackToggleBtn = document.querySelector("#feedback_toggle_btn");
const feedbackModal = document.querySelector("#feedback_modal");
const closeFeedbackBtn = document.querySelector("#close_feedback_btn");
const feedbackForm = document.querySelector("#feedback_form");
const feedbackInput = document.querySelector("#feedback_input");
const feedbackError = document.querySelector("#feedback_error");
const feedbackSubmitBtn = document.querySelector("#feedback_submit_btn");

function openFeedback() {
    feedbackModal.classList.add("active");
    document.body.classList.add("confession-modal-open");
    feedbackInput.focus();
}

function closeFeedback() {
    feedbackModal.classList.remove("active");
    document.body.classList.remove("confession-modal-open");
}

feedbackToggleBtn.addEventListener("click", openFeedback);
closeFeedbackBtn.addEventListener("click", closeFeedback);

feedbackModal.addEventListener("click", (event) => {
    if (event.target === feedbackModal) {
        closeFeedback();
    }
});

feedbackForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const content = feedbackInput.value.trim();

    if (!content) {
        feedbackError.textContent = "Vui lòng nhập nội dung góp ý.";
        feedbackInput.focus();
        return;
    }

    feedbackSubmitBtn.disabled = true;
    feedbackSubmitBtn.innerHTML =
        `<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...`;

    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                action: "feedback",
                content: content
            })
        });

        feedbackInput.value = "";
        feedbackError.textContent = "";
        closeFeedback();

        alert("Cảm ơn bạn! Góp ý đã được gửi thành công.");
    } catch (error) {
        console.error("Lỗi gửi góp ý:", error);
        feedbackError.textContent =
            "Không thể gửi góp ý. Vui lòng thử lại sau.";
    } finally {
        feedbackSubmitBtn.disabled = false;
        feedbackSubmitBtn.innerHTML =
            `<span>Gửi</span><i class="fa-solid fa-paper-plane"></i>`;
    }
});

feedbackInput.addEventListener("input", () => {
    feedbackError.textContent = "";
});

function showError(message) {
    if (errorBox) errorBox.textContent = message;
}

function clearError() {
    if (errorBox) errorBox.textContent = "";
}

if (input) {
    input.addEventListener("input", () => {
        clearError();
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";
    });
}

// --- Xử lý bật/tắt Emoji chính ---
const mainEmojiToggleBtn = form ? form.querySelector(".emoji_toggle_btn") : null;
const mainEmojiContainer = form ? form.querySelector(".emoji_picker_container") : null;

if (mainEmojiToggleBtn && mainEmojiContainer) {
    mainEmojiToggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isVisible = mainEmojiContainer.style.display === "block";
        mainEmojiContainer.style.display = isVisible ? "none" : "block";
    });

    mainEmojiContainer.querySelectorAll(".emoji_item").forEach((item) => {
        item.addEventListener("click", () => {
            const emoji = item.getAttribute("data-emoji");
            if (!input) return;

            const startPos = input.selectionStart;
            const endPos = input.selectionEnd;
            const text = input.value;

            input.value = text.substring(0, startPos) + emoji + text.substring(endPos);
            input.selectionStart = input.selectionEnd = startPos + emoji.length;
            input.focus();
            clearError();
        });
    });
}

document.addEventListener("click", (e) => {
    if (mainEmojiContainer && !mainEmojiContainer.contains(e.target) && e.target !== mainEmojiToggleBtn) {
        mainEmojiContainer.style.display = "none";
    }

    document.querySelectorAll(".comment_emoji_container").forEach((container) => {
        const boxWrapper = container.closest(".comment_form_wrapper");
        const toggleBtn = boxWrapper ? boxWrapper.querySelector(".comment_emoji_btn") : null;
        if (!container.contains(e.target) && e.target !== toggleBtn) {
            container.style.display = "none";
        }
    });
});

const submitConfessionBtn = form ? form.querySelector("button[type='submit']") : null;

if (form) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (submitConfessionBtn && submitConfessionBtn.dataset.loading === "true") {
            return;
        }

        let content = input.value.trim();

        if (content === "") {
            showError("Vui lòng nhập nội dung confession trước khi gửi.");
            return;
        }

        if (content.length > MAX_LENGTH) {
            showError(`Nội dung quá dài, giới hạn tối đa là ${MAX_LENGTH} ký tự.`);
            return;
        }

        if (content.startsWith("=")) {
            content = "'" + content;
        }

        if (mainEmojiContainer) mainEmojiContainer.style.display = "none";

        if (submitConfessionBtn) {
            submitConfessionBtn.dataset.loading = "true";
            submitConfessionBtn.disabled = true;
            submitConfessionBtn.style.opacity = "0.7";
            submitConfessionBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang gửi...</span>`;
        }

        try {
            await fetch(SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "confession", content: content })
            });
            alert("Gửi bài thành công! Bài viết của bạn sẽ được hiển thị sau khi admin kiểm duyệt.");
            input.value = "";
            input.style.height = "auto";
            clearError();
        } catch (err) {
            console.error("Lỗi gửi confession:", err);
            alert("Đã xảy ra lỗi kết nối trong quá trình gửi. Vui lòng kiểm tra lại mạng hoặc thử lại sau!");
        } finally {
            if (submitConfessionBtn) {
                submitConfessionBtn.dataset.loading = "false";
                submitConfessionBtn.disabled = false;
                submitConfessionBtn.style.opacity = "1";
                submitConfessionBtn.innerHTML = `<span>Gửi bài</span><i class="fa-solid fa-arrow-up-from-bracket"></i>`;
            }
        }
    });
}

loadApprovedConfessions();
setInterval(loadApprovedConfessions, 5000);
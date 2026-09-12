import { useEffect, useMemo, useState } from "react";

import { LIKED_KEY, MAX_LENGTH } from "./constants";
import { formatDate, readStoredLikes } from "./utils";
import { supabase } from "./supabase";

import Announcements from "./components/Announcements";
import ConfessionCard from "./components/ConfessionCard";
import EmojiPicker from "./components/EmojiPicker";
import Modal from "./components/Modal";

import incognitoLogo from "./assets/incognito.svg";
import readmeMarkdown from "./README.md?raw";

const renderReadmeMarkdown = (markdown) => {
  const formatInline = (text) =>
    text
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return markdown
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const trimmed = block.trim();

      if (!trimmed) return "";

      if (trimmed.startsWith("### ")) {
        return `<h3>${formatInline(trimmed.replace(/^###\s*/, ""))}</h3>`;
      }

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed
          .split(/\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => `<li>${formatInline(line.replace(/^[-*]\s*/, ""))}</li>`)
          .join("");

        return `<ul>${items}</ul>`;
      }

      if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
        return trimmed;
      }

      return `<p>${formatInline(trimmed)}</p>`;
    })
    .join("\n");
};


export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("nhs_theme") === "dark" ? "dark" : "light");

  const [confessions, setConfessions] = useState([]);

  const [liked, setLiked] = useState(readStoredLikes);

  const [expandedId, setExpandedId] = useState(null);

  const [search, setSearch] = useState("");
  const [dateSearch, setDateSearch] = useState("");

  const [readmeOpen, setReadmeOpen] = useState(false);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [content, setContent] = useState("");

  const [mainEmojiOpen, setMainEmojiOpen] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("nhs_theme", theme);
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle(
      "confession-modal-open",
      Boolean(expandedId || readmeOpen || feedbackOpen)
    );

    return () => {
      document.body.classList.remove("confession-modal-open");
    };
  }, [
    expandedId,
    readmeOpen,
    feedbackOpen
  ]);

  const load = async () => {
    const { data, error: loadError } = await supabase
      .from("confessions")
      .select(`
        uuid,
        created_at,
        content,
        status,
        likes,
        comment_count,
        last_updated,
        comments (
          id,
          content,
          created_at
        )
      `)
      .in("status", ["approved", "important"])
      .order("created_at", {ascending: true});

    if (loadError) {
      throw loadError;
    }

    const normalized = (data || []).map(
      (item) => ({
        uuid: String(item.uuid),
        status: item.status || "approved",
        content: item.content || "",
        time: item.created_at,
        likes: Number(item.likes) || 0,
        commentCount: Number(item.comment_count) || 0,
        lastUpdated:item.last_updated ? new Date(item.last_updated).getTime() : Date.now(),
        comments:
          Array.isArray(item.comments)
            ? [...item.comments]
              .sort(
                (a, b) => new Date(a.created_at) - new Date(b.created_at)
              )
              .map((comment) => ({
                id: comment.id,
                content: comment.content || "",
                time: comment.created_at
              }))
            : []
      })
    );

    setConfessions(normalized);
  };

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const poll = async () => {
      try {
        await load();

        if (!cancelled) {
          setError("");
        }
      } catch (loadError) {
        console.error("Supabase load error:", loadError);

        if (!cancelled) {
          setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }

      if (!cancelled) {
        timer = setTimeout(poll, 15000);
      }
    };

    poll();

    const visibility = () => {
      if (!document.hidden) {
        load().catch((refreshError) => {
          console.error("Refresh error:", refreshError);
        });
      }
    };

    document.addEventListener("visibilitychange",visibility);

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }

      document.removeEventListener( "visibilitychange",visibility);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("public-confessions")
      .on("postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "confessions"
        },
        () => {
          load().catch((error) => {
            console.error("Realtime refresh error:",error);
          });
        }
      )
      .on("postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments"
        },
        () => {
          load().catch((error) => {
            console.error("Realtime comment refresh error:", error);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const normal = useMemo(() => {
    const sorted = confessions
      .filter((item) => item.status !== "important")
      .sort((a, b) => new Date(a.time) - new Date(b.time))
      .map((item, index) => ({
        ...item,
        number: index + 1
      }));

    const query = search.replace("#", "").trim();
    const dateQuery = dateSearch.replace("#", "").trim();

    return sorted
      .filter((item) => {
        const matchesId =
          !query ||
          String(item.number)
            .padStart(3, "0")
            .includes(query) ||
          String(item.number)
            .includes(query);

        if (!dateQuery) {
          return matchesId;
        }

        const formattedDate = formatDate(item.time).toLowerCase();

        return (
          matchesId &&
          formattedDate.includes(
            dateQuery.toLowerCase()
          )
        );
      })
      .sort((a, b) => b.number - a.number);
  }, [
    confessions,
    search,
    dateSearch
  ]);

  const announcements = useMemo(
    () =>
      confessions
        .filter( (item) => item.status === "important" )
        .sort( (a, b) => new Date(b.time) - new Date(a.time) ),
    [confessions]
  );

  const groups = useMemo(
    () =>
      normal.reduce(
        (result, item) => {
          const key = item.time ? formatDate(item.time) : "Khác";
          (result[key] ||= []).push(item);
          return result;
        },
        {}
      ),
    [normal]
  );

  const like = async (uuid) => {
    const id = String(uuid);

    if (liked.includes(id)) {
      return;
    }

    const nextLiked = [...liked, id];

    setLiked(nextLiked);

    localStorage.setItem(
      LIKED_KEY,
      JSON.stringify(nextLiked)
    );

    setConfessions((items) =>
      items.map((item) =>
        String(item.uuid) === id
          ? {
            ...item,
            likes: (item.likes || 0) + 1
          }
          : item
      )
    );

    try {
      const {data,error: likeError} = await supabase.rpc( "like_confession",{ p_uuid: id});

      if (likeError) {
        throw likeError;
      }

      if (data && typeof data.likes === "number") {
        setConfessions((items) =>
          items.map((item) =>
            String(item.uuid) === id
              ? {...item, likes: data.likes}
              : item
          )
        );
      }
    } catch (likeError) {
      console.error( "Lỗi cập nhật lượt thích:", likeError );
      setLiked((current) =>
        current.filter((value) => value !== id)
      );

      localStorage.setItem(
        LIKED_KEY,
        JSON.stringify(liked)
      );

      setConfessions((items) =>
        items.map((item) =>
          String(item.uuid) === id
            ? {
              ...item,
              likes: Math.max(0, (item.likes || 1) - 1)
            }
            : item
        )
      );
    }
  };
  const fetchComments = async (uuid) => {
    try {
      const {data, error: commentsError} = await supabase
        .from("comments")
        .select("id, content, created_at")
        .eq("uuid", uuid)
        .order("created_at", {ascending: true});

      if (commentsError) {
        throw commentsError;
      }

      const comments = (data || []).map((comment) => ({
        id: comment.id,
        content: comment.content || "",
        time: comment.created_at
      }));

      setConfessions((items) =>
        items.map((item) =>
          String(item.uuid) ===
            String(uuid)
            ? {
              ...item,
              comments,
              commentCount: comments.length
            }
            : item
        )
      );
    } catch (commentsError) {
      console.error("Comments request failed:", commentsError);
    }
  };

  const addComment = async (uuid, text) => {
    const value = text.trim();

    if (!value) {return;}

    try {
      const {data, error: commentError} = await supabase.rpc(
        "add_comment",
        {
          p_uuid: uuid,
          p_content: value
        }
      );

      if (commentError) {
        throw commentError;
      }

      const returnedComment = data?.comment;

      const comment = {
        id: returnedComment?.id ?? Date.now(),
        content: returnedComment?.content ?? value,
        time: returnedComment?.time ?? new Date().toISOString()
      };

      setConfessions((items) =>
        items.map((item) =>
          String(item.uuid) === String(uuid)
            ? {
              ...item,
              comments: [...(item.comments || []), comment],
              commentCount: (item.commentCount || 0) + 1
            }
            : item
        )
      );
    } catch (commentError) {
      console.error("Comment submit error:", commentError);
      alert("Không thể gửi bình luận. Vui lòng thử lại sau.");
    }
  };
  const submitConfession = async (event) => {
    event.preventDefault();

    let value = content.trim();

    if (!value) {
      setError("Vui lòng nhập nội dung confession trước khi gửi.");
      return;
    }

    if (value.length > MAX_LENGTH) {
      setError(`Nội dung quá dài, giới hạn tối đa là ${MAX_LENGTH} ký tự.`);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { error: submitError } = await supabase
        .from("confessions")
        .insert({
          content: value,
          status: "pending"
        });

      if (submitError) {
        throw submitError;
      }

      alert("Gửi bài thành công! Bài viết của bạn sẽ được hiển thị sau khi admin kiểm duyệt.");

      setContent("");
      setMainEmojiOpen(false);
    } catch (submitError) {
      console.error("Lỗi gửi confession:", submitError);
      alert("Đã xảy ra lỗi kết nối trong quá trình gửi. Vui lòng kiểm tra lại mạng hoặc thử lại sau!");
    } finally {
      setSubmitting(false);
    }
  };

  const submitFeedback = async (event) => {
    event.preventDefault();
    const value = feedback.trim();

    if (!value) {
      setFeedbackError("Vui lòng nhập nội dung góp ý.");
      return;
    }

    if (value.length > MAX_LENGTH) {
      setFeedbackError(`Nội dung quá dài, giới hạn tối đa là ${MAX_LENGTH} ký tự.`);
      return;
    }

    setFeedbackLoading(true);
    setFeedbackError("");

    try {
      const {error: feedbackSubmitError} = await supabase
        .from("feedback")
        .insert({content: value});

      if (feedbackSubmitError) {
        throw feedbackSubmitError;
      }

      setFeedback("");
      setFeedbackError("");
      setFeedbackOpen(false);

      alert("Cảm ơn bạn! Góp ý đã được gửi thành công.");
    } catch (feedbackSubmitError) {
      console.error("Lỗi gửi góp ý:",feedbackSubmitError);
      setFeedbackError("Không thể gửi góp ý. Vui lòng thử lại sau.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <>
      <div className="app_container">
        <header className="hero_section">
          <button id="readme_toggle_btn" title="Hướng dẫn sử dụng / README" onClick={() => setReadmeOpen(true)}>
            <i className="fa-solid fa-book-open" />
            <span>README</span>
          </button>

          <button id="theme_toggle_btn" title="Chuyển đổi giao diện" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            <i className={`fa-solid fa-${theme === "dark"? "sun" : "moon"}`}/>

            <span className="theme_text">
              {theme === "dark"? "Chế độ sáng": "Chế độ tối"}
            </span>
          </button>

          <div id="picture">
            <img src={incognitoLogo} alt="incognito logo" />
          </div>

          <div className="header_titles">
            <h1>NHSC Confessions</h1>
            <h4>
              <i className="fa-solid fa-clock-rotate-left" />{" "}
              Bài viết sẽ được hiển thị công khai sau khi được kiểm duyệt
            </h4>
          </div>

          <div id="chu_thich">
            <i className="fa-solid fa-circle-info info_icon" />
            <span>Nơi chia sẻ ẩn danh tâm tư, kỷ niệm học đường một cách tự do và có chừng mực.</span>
          </div>
        </header>

        <Announcements 
          announcements={announcements}
          expandedId={expandedId}
          liked={liked}
          onOpen={setExpandedId}
          onClose={() => setExpandedId(null)}
          onLike={like}
          onComment={addComment}
          fetchComments={fetchComments}
        />

        <section className="card_wrapper">
          <div id="send_confession">
            <h3>
              <i className="fa-solid fa-paper-plane" />{" "}
              Gửi Confession
            </h3>
          </div>

          <form id="confession_form" autoComplete="off" onSubmit={submitConfession}>
            <div className="input_group">
              <div className="textarea_wrapper">
                <textarea
                  id="confession_input"
                  rows="2"
                  maxLength={MAX_LENGTH}
                  placeholder="Nhập nội dung tâm sự ẩn danh của bạn tại đây..."
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);
                    setError("");
                  }}
                />
                <button
                  type="button"
                  className="emoji_toggle_btn inside_input"
                  title="Chọn biểu cảm"
                  onClick={() => setMainEmojiOpen( (value) => !value )}
                >
                  <i className="fa-regular fa-face-smile" />
                </button>

                {mainEmojiOpen && (
                  <div className="emoji_picker_container main_emoji_popup visible">
                    <EmojiPicker onSelect={(emoji) => {
                      setContent((value) => `${value}${emoji}`);
                      setMainEmojiOpen(false);
                    }}/>
                  </div>
                )}

              </div>
              <button type="submit" disabled={submitting}>
                <span>{submitting ? "Đang gửi..." : "Gửi bài"}</span>
                <i className={`fa-solid fa-${submitting ? "spinner fa-spin": "arrow-up-from-bracket"}`}/>
              </button>
            </div>
          </form>
          <p id="form_error">{error}</p>
        </section>

        <section id="search_container">
          <div className="search_box">
            <i className="fa-solid fa-hashtag search_icon" />
            <input
              id="search_input"
              type="text"
              placeholder="Tìm kiếm theo mã ID (Ví dụ: #001, #002...)"
              autoComplete="off"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="search_box">
            <i className="fa-regular fa-calendar-days search_icon" />
            <input
              id="search_date_input"
              type="text"
              placeholder="Tìm kiếm theo ngày (Ví dụ: #20/08/2026)"
              autoComplete="off"
              value={dateSearch}
              onChange={(event) => setDateSearch(event.target.value)}
            />
          </div>
        </section>

        <main id="confession_list">
          {initialLoading ? (
            <p style={{textAlign:"center", color:"var(--text-muted)", padding: 20}}>
              Đang tải...
            </p>
          ) : error ? (
            <p style={{textAlign:"center", color:"var(--text-muted)", padding: 20}}>
              {error}
            </p>
          ) : normal.length ? (

            Object.entries(groups).map(([date, items]) => (
                <div className="date_block" key={date}>
                  <div className="date_block_header">
                    📅 Ngày {date}
                  </div>
                  <div className="date_block_grid">
                    {items.map((item) => (
                      <ConfessionCard 
                        key={item.uuid} 
                        confession={item} 
                        expanded={expandedId === String(item.uuid)}
                        liked={liked.includes(String(item.uuid))}
                        onOpen={setExpandedId}
                        onClose={() => setExpandedId(null)}
                        onLike={like}
                        onComment={addComment}
                        fetchComments={fetchComments}
                      />
                    ))}
                  </div>
                </div>
              )
            )
          ) : (
            <p style={{textAlign:"center", color:"var(--text-muted)", padding: 20}}>
              {confessions.filter((item) => item.status !== "important").length
                ? "Không tìm thấy bài viết phù hợp với điều kiện tìm kiếm."
                : "Chưa có bài viết nào được phê duyệt."}
            </p>
          )}
        </main>
      </div>

      <div id="confession_backdrop" className={expandedId ? "active": ""} onClick={() => setExpandedId(null)}/>

      <Modal open={readmeOpen} onClose={() =>setReadmeOpen(false)}>
        <button
          type="button"
          className="close_readme_btn"
          title="Đóng bảng hướng dẫn"
          onClick={() => setReadmeOpen(false)}
        >
          <i className="fa-solid fa-xmark" />
        </button>

        <h2>
          <i className="fa-solid fa-book-open" style={{color:"var(--accent-color)"}}/>{" "}Hướng dẫn sử dụng & Giới thiệu
        </h2>

        <div className="readme_body" dangerouslySetInnerHTML={{__html: renderReadmeMarkdown(readmeMarkdown)}}/>

        <button
          type="button"
          className="feedback_toggle_btn"
          onClick={() => {
            setReadmeOpen(false);
            setFeedbackOpen(true);
          }}
        >
          <i className="fa-solid fa-comment-dots" />{" "}
          Gửi góp ý
        </button>
      </Modal>

      <Modal open={feedbackOpen} onClose={() =>setFeedbackOpen(false)} className="feedback_modal_content">
        <button
          type="button"
          className="close_readme_btn"
          title="Đóng bảng góp ý"
          onClick={() =>setFeedbackOpen(false)}
        >
          <i className="fa-solid fa-xmark" />
        </button>

        <h2>
          <i className="fa-solid fa-comment-dots" style={{color:"var(--accent-color)"}}/>{" "}
          Gửi góp ý
        </h2>

        <form className="feedback_form" autoComplete="off" onSubmit={submitFeedback}>
          <label htmlFor="feedback_input">Chia sẻ góp ý của bạn</label>

          <textarea
            id="feedback_input"
            rows="5"
            maxLength={MAX_LENGTH}
            placeholder="Nhập góp ý hoặc đề xuất của bạn..."
            value={feedback}
            onChange={(event) => {
              setFeedback(event.target.value);
              setFeedbackError("");
            }}
          />

          <p id="feedback_error">
            {feedbackError}
          </p>

          <button type="submit" id="feedback_submit_btn" disabled={feedbackLoading}>
            {feedbackLoading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                {" "}
                Đang gửi...
              </>
            ) : (
              <>
                <span>Gửi</span>
                <i className="fa-solid fa-paper-plane" />
              </>
            )}
          </button>
        </form>
      </Modal>
    </>
  );
}
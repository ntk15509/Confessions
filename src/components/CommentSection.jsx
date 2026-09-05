import { useEffect, useState } from "react";
import { MAX_LENGTH } from "../constants";
import { formatTime } from "../utils";
import EmojiPicker from "./EmojiPicker";

export default function CommentSection({ confession, onComment, fetchComments }) {
  const [input, setInput] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [loading, setLoading] = useState(confession.comments === null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (confession.comments === null) {
      fetchComments(confession.uuid).catch(() => setError(true)).finally(() => setLoading(false));
    }
  }, [confession.uuid, confession.comments, fetchComments]);

  const submit = async (event) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await onComment(confession.uuid, text);
  };

  return <div className="comments_section" onClick={(event) => event.stopPropagation()}>
    <div className="comment_list">{loading ? <div style={{ textAlign: "center", padding: 10, color: "var(--text-muted)" }}><i className="fa-solid fa-spinner fa-spin" /> Đang tải bình luận...</div> : error ? <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 10 }}>Không thể tải bình luận.</p> : confession.comments?.length ? confession.comments.map((comment, index) => <div className="comment_item" key={`${comment.time || "comment"}-${index}`}><span className="comment_text">{typeof comment === "object" ? comment.content : comment}</span>{typeof comment === "object" && comment.time && <span className="comment_time" style={{ fontSize: "0.8em", color: "#888", marginLeft: 8 }}>{formatTime(comment.time)}</span>}</div>) : <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 10 }}>Chưa có bình luận nào.</p>}</div>
    <div className="comment_form_wrapper"><form className="comment_form" onSubmit={submit}><textarea className="comment_input" rows="1" maxLength={MAX_LENGTH} placeholder="Viết bình luận..." value={input} onChange={(event) => setInput(event.target.value)} /><button type="button" className="comment_emoji_btn" title="Chọn biểu cảm" onClick={() => setEmojiOpen((value) => !value)}><i className="fa-regular fa-face-smile" /></button><button type="submit" className="comment_submit">Gửi</button></form>{emojiOpen && <div className="emoji_picker_container comment_emoji_container"><EmojiPicker onSelect={(emoji) => { setInput((value) => `${value}${emoji}`); setEmojiOpen(false); }} /></div>}</div>
  </div>;
}
